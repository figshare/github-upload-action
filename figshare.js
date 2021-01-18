/* eslint class-methods-use-this:0 */
/* eslint quote-props: ["error", "consistent-as-needed"] */

const fetch = require('node-fetch');

class FigshareAPI {
  constructor(token, endpoint) {
    this.token = token;
    this.endpoint = endpoint;
    this.articlePathPrefix = 'account/articles';
    this.filePathPrefix = 'files';
    this.headers = {
      'Authorization': `token ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async getArticle(articleID) {
    const articleUrl = `${this.endpoint}/${this.articlePathPrefix}/${articleID}`;
    let articleData = await fetch(articleUrl, { headers: this.headers });
    articleData = await articleData.json();
    return articleData;
  }

  async initiateFileUpload(articleID, fileData) {
    const fileAPIUrl = `${this.endpoint}/${this.articlePathPrefix}/${articleID}/files`;
    const fData = await fetch(fileAPIUrl, {
      method: 'post',
      body: JSON.stringify({
        name: fileData.name,
        size: Number(fileData.size),
        md5: fileData.md5,
      }),
      headers: this.headers,
    });
    const jsonData = await fData.json();
    const fileUrl = jsonData.location;
    const fileRequest = await fetch(fileUrl, { headers: this.headers });
    const fileResponse = await fileRequest.json();
    fileResponse.localPath = fileData.path;
    return fileResponse;
  }

  async getFilePartsInfo(fileURL) {
    const partsRequest = await fetch(fileURL);
    let partsData = await partsRequest.json();
    partsData = partsData.parts;
    return partsData;
  }

  async uploadFilePartContent(uploadURL, partData, partContent) {
    const uploadPartURL = `${uploadURL}/${partData.partNo}`;
    const uploadRequest = await fetch(uploadPartURL, {
      method: 'put',
      body: partContent,
    });
    return uploadRequest.ok;
  }

  async completeFileUpload(articleID, fileData) {
    const fileID = fileData.id;
    const fileURL = `${this.endpoint}/${this.articlePathPrefix}/${articleID}/${this.filePathPrefix}/${fileID}`;
    await fetch(fileURL, {
      method: 'post',
      headers: this.headers,
    });
    return fileData;
  }
}

module.exports = FigshareAPI;
