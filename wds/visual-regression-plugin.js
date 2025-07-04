import { visualRegressionPlugin } from '@web/test-runner-visual-regression/plugin';
import { CellarClient } from '../tasks/cellar-client.js';
import { BUCKET_NAME, getScreenshotPath } from '../test/helpers/get-screenshot-path.js';

const cellar = new CellarClient({
  bucket: BUCKET_NAME,
  accessKeyId: process.env.VISUAL_REGRESSIONS_CELLAR_KEY_ID,
  secretAccessKey: process.env.VISUAL_REGRESSIONS_CELLAR_SECRET_KEY,
});

export const visualRegressionPluginWithConfig = visualRegressionPlugin({
  diffOptions: {
    threshold: 0.1, // matching threshold (0 to 1); smaller is more sensitive
    includeAA: false, // whether to skip anti-aliasing detection
    alpha: 0.3, // opacity of original image in diff output
    aaColor: [255, 255, 0], // color of anti-aliased pixels in diff output
    diffColor: [30, 30, 30], // color of different pixels in diff output
    diffColorAlt: [255, 0, 0], // whether to detect dark on light differences between img1 and img2 and set an alternative color to differentiate between the two
    diffMask: false, // draw the diff over a transparent background (a mask)
  },
  update: process.argv.includes('--update-visual-baseline'), // should we force to target some component or all? need to test what happens when you update baseline and it's already ok?
  getBaselineName({ browser, name: componentWithStoryName }) {
    return getScreenshotPath({ browser, componentWithStoryName, screenshotType: 'baseline' });
  },
  getDiffName({ browser, name: componentWithStoryName }) {
    return getScreenshotPath({ browser, componentWithStoryName, screenshotType: 'diff' });
  },
  getFailedName({ browser, name: componentWithStoryName }) {
    return getScreenshotPath({ browser, componentWithStoryName, screenshotType: 'changes' });
  },
  async getBaseline({ name }) {
    if (process.argv.includes('--update-visual-baseline')) {
      return null;
    }

    const fileBufferFromCurrentBranch = await cellar
      .getImage({ key: name })
      .then((response) => {
        return new Promise((resolve, reject) => {
          const data = [];
          response.Body.on('data', (chunk) => data.push(chunk));
          response.Body.on('end', () => resolve(Buffer.concat(data)));
          response.Body.on('error', reject);
        });
      })
      .catch((err) => {
        // TODO proper error filtering (some are ok to be silenced but others are not?)
        console.log('error getting baseline from current branch', name, err);
      });

    return fileBufferFromCurrentBranch;
  },
  async saveBaseline({ content, name }) {
    // TODO: should we remove the whole baseline content first? => would probably need to be done elsewhere

    await cellar
      .putObject({
        key: name,
        body: content,
      })
      .catch((err) => {
        console.log('failed to save baseline', name, err);
      });
  },
  async saveDiff({ content, name }) {
    await cellar
      .putObject({
        key: name,
        body: content,
      })
      .then((response) => {
        // console.log('saved diff', cellarKey, name);
      })
      .catch((err) => {
        console.log('failed to save DIFF', name, err);
      });
  },
  async saveFailed({ content, name }) {
    await cellar
      .putObject({
        key: name,
        body: content,
      })
      .then((response) => {
        // console.log('saved failed', cellarKey, name);
      })
      .catch((err) => {
        console.log('failed to save FAILED', name, err);
      });
  },
});
