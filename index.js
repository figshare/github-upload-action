/* eslint arrow-body-style:0 */
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const md5File = require('md5-file');

const FigshareAPI = require('./figshare');

const FIGSHARE_TOKEN = core.getInput('FIGSHARE_TOKEN', { required: true });
const FIGSHARE_ENDPOINT = core.getInput('FIGSHARE_ENDPOINT', { required: true });
const FIGSHARE_ARTICLE_ID = core.getInput('FIGSHARE_ARTICLE_ID', { required: true });
const DATA_DIR = core.getInput('DATA_DIR', { required: true });

function getFileInfo(filePath) {
  const fileStats = fs.statSync(filePath);

  return {
    size: fileStats.size,
    name: path.basename(filePath),
    md5: md5File.sync(filePath),
    path: filePath,
  };
}

async function uploadFileContent(fAPI, fileData) {
  const fileURL = fileData.upload_url;
  core.info(`Working on file ${fileData.id} - ${fileURL}`);

  const filePath = fileData.localPath;
  const fileParts = await fAPI.getFilePartsInfo(fileURL);
  const doneParts = fileParts.map((pData) => {
    core.info(`Started part ${pData.partNo} for ${fileData.id} - ${fileURL}`);

    const { startOffset: start, endOffset: end } = pData;
    const pRead = fs.createReadStream(filePath, { start, end });

    return fAPI.uploadFilePartContent(fileURL, pData, pRead);
  });

  const results = await Promise.all(doneParts);
  const failedStatus = results.filter((res) => res === false);
  if (failedStatus.length > 0) {
    throw new Error(`Unexpected error uploadFileContent on ${fileData.id} - ${fileURL}`);
  }

  core.info(`Completed parts upload for ${fileData.id} - ${fileURL}`);
}

async function run() {
  const fAPI = new FigshareAPI(FIGSHARE_TOKEN, FIGSHARE_ENDPOINT);
  const articleData = await fAPI.getArticle(FIGSHARE_ARTICLE_ID);
  const sourceDir = path.join(process.cwd(), DATA_DIR);
  let localFiles = fs.readdirSync(sourceDir, { withFileTypes: true });
  localFiles = localFiles.filter((ff) => ff.isFile()).map((ff) => `${sourceDir}/${ff.name}`);
  localFiles = localFiles.map(getFileInfo);

  const figFiles = async () => {
    return Promise.all(localFiles.map((ff) => {
      core.info(`Found file ${ff.name} to upload`);

      return fAPI.initiateFileUpload(articleData.id, ff);
    }));
  };
  const fileEntries = await figFiles();

  const uploadPromises = fileEntries.map((file) => uploadFileContent(fAPI, file));
  await Promise.all(uploadPromises);

  const completePromises = fileEntries.map((file) => fAPI.completeFileUpload(FIGSHARE_ARTICLE_ID, file));
  const completedFiles = await Promise.all(completePromises);

  return completedFiles;
}

async function init() {
  try {
    const completed = await run();

    completed.forEach((ff) => {
      core.info(`Successfully uploaded file ${ff.download_url}`);
      core.setOutput(`uploaded_file_${ff.id}`, ff.download_url);
    });
  } catch (err) {
    core.error(err);
    core.setFailed(err.message);
  }
}

init();
