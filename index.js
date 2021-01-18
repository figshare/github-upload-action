/* eslint arrow-body-style:0 */
const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const md5File = require('md5-file');

const FigshareAPI = require('./figshare');

const FIGSHARE_TOKEN = core.getInput('FIGSHARE_TOKEN', {
  required: true,
});

const FIGSHARE_ENDPOINT = core.getInput('FIGSHARE_ENDPOINT', {
  required: true,
});

const FIGSHARE_ARTICLE_ID = core.getInput('FIGSHARE_ARTICLE_ID', {
  required: true,
});

const DATA_DIR = core.getInput('DATA_DIR', {
  required: true,
});

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
  const doneParts = [];
  for (let index = 0; index < fileParts.length; index += 1) {
    const pData = fileParts[index];
    const pRead = fs.createReadStream(filePath, {
      start: pData.startOffset,
      end: pData.endOffset,
    });
    doneParts.push(fAPI.uploadFilePartContent(fileURL, pData, pRead));
    core.info(`Started part ${pData.partNo} for ${fileData.id} - ${fileURL}`);
  }
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

  const fParts = async () => {
    return Promise.all(fileEntries.map((ff) => {
      return uploadFileContent(fAPI, ff);
    }));
  };
  await fParts();

  const completeFiles = async () => {
    return Promise.all(fileEntries.map((ff) => {
      return fAPI.completeFileUpload(FIGSHARE_ARTICLE_ID, ff);
    }));
  };
  const completedFiles = await completeFiles();

  return completedFiles;
}

async function init() {
  const completed = await run();
  return completed;
}

init()
  .then((completed) => {
    completed.forEach((ff) => {
      core.info(`Successfully uploaded file ${ff.download_url}`);
      core.setOutput(`uploaded_file_${ff.id}`, ff.download_url);
    });
  })
  .catch((err) => {
    core.error(err);
    core.setFailed(err.message);
  });
