import { appendFileSync } from 'node:fs';
import { CELLAR_HOST, CellarClient } from './cellar-client.js';
import { getBranchBaseCommit, getCurrentBranch } from './git-utils.js';

const CURRENT_BRANCH = getCurrentBranch();
const BUCKET_NAME = 'clever-test-flo-visual-regressions';
const REMOTE_DIR = `${CURRENT_BRANCH}/test-reports`;
const cellar = new CellarClient({
  bucket: BUCKET_NAME,
  accessKeyId: process.env.VISUAL_REGRESSIONS_CELLAR_KEY_ID,
  secretAccessKey: process.env.VISUAL_REGRESSIONS_CELLAR_SECRET_KEY,
});

if (process.argv.includes('delete')) {
  await deleteReportAndAssociatedData();
}

if (process.argv.includes('upload')) {
  await uploadReport();
}

if (process.argv.includes('check-for-baseline-update')) {
  await checkForLastBaselineUpdate();
}

async function uploadReport() {
  await cellar.sync({ localDir: 'test-reports/', remoteDir: REMOTE_DIR, deleteRemoved: true }).catch((error) => {
    console.error(error);
    process.exit(1);
  });

  const reportUrl = new URL(`${REMOTE_DIR}/visual-regression-results.html`, `https://${BUCKET_NAME}.${CELLAR_HOST}`);
  if (process.env.GITHUB_OUTPUT != null) {
    appendFileSync(process.env.GITHUB_OUTPUT, `report_url=${reportUrl.href}\n`);
  } else {
    console.log('Report uploaded to: ' + reportUrl);
  }
}

async function deleteReportAndAssociatedData() {
  try {
    const keys = await cellar.listKeys({ prefix: CURRENT_BRANCH + '/' });
    await cellar.deleteManyObjects({ prefix: CURRENT_BRANCH + '/' });

    if (process.env.GITHUB_OUTPUT != null) {
      appendFileSync(process.env.GITHUB_OUTPUT, `has_deleted_report=${keys.length > 0}\n`);
    }
  } catch (error) {
    console.error(error);
    if (process.env.GITHUB_OUTPUT != null) {
      appendFileSync(process.env.GITHUB_OUTPUT, `has_deleted_report=false\n`);
    }
    process.exit(1);
  }
}

async function checkForLastBaselineUpdate() {
  try {
    console.log('Fetching last report');
    const { baselineMetadata } = await cellar.getObject({
      key: `${CURRENT_BRANCH}/test-reports/visual-regression-results-merged.json`,
    });
    const baseCommit = process.env.BASE_SHA ?? getBranchBaseCommit();

    console.log('Current baseline commit: ' + baseCommit);
    console.log('Last report baseline commit: ' + baselineMetadata.commitReference);
    console.log('Last report baseline update: ' + baselineMetadata.lastUpdated);

    const shouldUpdateBaseline = baseCommit !== baselineMetadata.commitReference;

    if (process.env.GITHUB_OUTPUT != null) {
      appendFileSync(
        process.env.GITHUB_OUTPUT,
        `should_update_baseline=${shouldUpdateBaseline}\nlast_baseline_update=${baselineMetadata.lastUpdated}\n`,
      );
    }
    console.log('Baseline should be updated: ' + shouldUpdateBaseline);
  } catch (error) {
    if (error.message === 'NoSuchKey') {
      appendFileSync(process.env.GITHUB_OUTPUT, `should_update_baseline=true\n`);
    }
    console.error(error);
  }
}
