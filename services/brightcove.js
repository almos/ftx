const config = require('../config');
const axios = require('axios');
const qs = require('querystring');
const logger = require('../services/logger').instance;
const fs = require('fs');
const AWS = require('aws-sdk');
const timeUtils = require('../utils/timeutils');
const _ = require('lodash');

/**
 * Obtains OAuth token for accessing brightcove endpoints
 * @returns {*|AxiosPromise}
 */
function obtainAccessToken() {
  return axios({
    method: 'post',
    url: config.brightcove.accessTokenUrl,
    data: qs.stringify({ grant_type: 'client_credentials' }),
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    auth: {
      username: config.brightcove.oAuthClientId,
      password: config.brightcove.oAuthClientSecret,
    },
  });
}

/**
 * Creates video object entity on the brightcove
 * @param token OAuth token to access video creation endpoint
 * @returns {*|AxiosPromise}
 */
function createVideo(token) {
  return axios({
    method: 'post',
    url: config.brightcove.getCreateVideoUrl(),
    data: {
      name: 'my video',
    },
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}

/**
 * Get all folders from remote brightcove system
 * @param token OAuth token to access brightcove API
 * @returns {*|AxiosPromise}
 */
function getAllFolders(token) {
  return axios({
    method: 'get',
    url: config.brightcove.getAllFoldersUrl(),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}

/**
 * Set folder for video on a remote brightcove system
 * @param token OAuth token to access brightcove API
 * @param folderId - String, brightcove folder Id
 * @param videoId - String, brightcove video Id
 * @returns {*|AxiosPromise}
 */
function addVideoToFolderImpl(token, folderId, videoId) {
  return axios({
    method: 'put',
    url: config.brightcove.getAddFolderForVideoUrl(folderId, videoId),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}

/**
 * Update video metadata on a remote brightcove system
 * @param token OAuth token to access brightcove API
 * @param videoId - String, brightcove video id
 * @param name - String, video title
 * @param tags - [String], array of tags
 * @param reference_id - String, video reference-id (must be unique within the account)
 * @param long_description - String, video long description - can only be added on update, not creation
 * @returns {*|AxiosPromise}
 */
function updateVideoMetadataImpl(token, videoId, name, tags, reference_id, long_description) {
  return axios({
    method: 'patch',
    url: config.brightcove.getUpdateMetadataVideoUrl(videoId),
    data: {
      name,
      tags,
      reference_id,
      long_description,
    },
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}

function getFolderIdByName(token, folderName) {
  return new Promise((resolve, reject) => {
    const _folderName = folderName.toLowerCase();
    getAllFolders(token)
      .then((res) => {
        let folderObj = res.data.find((folder) => folder.name == _folderName);
        if (folderObj) {
          resolve(folderObj.id);
        } else {
          throw new Error(`Folder with name ${_folderName} doesn't exist`);
        }
      })
      .catch((error) => {
        logger.error(`Unable to get folder Id by name. Message: ${error.message}`);
        reject(error);
      });
  });
}

function addVideoToExistingFolder(token, videoId, folderId) {
  return new Promise((resolve, reject) => {
    addVideoToFolderImpl(token, folderId, videoId)
      .then((res) => {
        resolve(res.status);
      })
      .catch((error) => {
        logger.error(
          `Failed to add video ${videoId} to an existing folder (It might not exist on brightcove). Message: ${error.message}`,
        );
        reject(error);
      });
  });
}

function updateVideoMetadata(token, videoId, name, tags, referenceId, longDescription) {
  // logger.info(`Starting brightcove video ${videoId} update process`);
  return new Promise((resolve, reject) => {
    updateVideoMetadataImpl(token, videoId, name, tags, referenceId, longDescription)
      .then((updatedVideo) => {
        resolve(updatedVideo);
      })
      .catch((error) => {
        logger.error(`Failed to update metadata for video ${videoId}. Message: ${error.message}`);
        reject(error);
      });
  });
}

/**
 * Obtains URL for uploading a local video to remote brightcove system
 * @param token OAuth token to access video creation endpoint
 * @param videoId brightcove video identifier
 * @param sourceVideoFilename file name to upload
 * @returns {*|AxiosPromise}
 */
function obtainUploadUrl(token, videoId, sourceVideoFilename) {
  return axios({
    method: 'get',
    url: config.brightcove.getUploadUrlsUrl(videoId, sourceVideoFilename),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}

function obtainRemoteVideo(videoId) {
  return axios({
    method: 'get',
    url: config.brightcove.getVideoUrl(videoId),
    headers: {
      Accept: `application/json;pk=${config.brightcove.policyKey}`,
    },
  });
}

/**
 * Uploads file to brightcove using s3 compatible interface
 * @param localFilePath full path to a file to upload
 * @param credentials
 * @returns {Promise<PromiseResult<S3.PutObjectOutput, AWSError>>}
 */
function uploadFile(localFilePath, credentials) {
  AWS.config.update({
    credentials: new AWS.Credentials(
      credentials.access_key_id,
      credentials.secret_access_key,
      credentials.session_token,
    ),
  });

  let uploadStream = fs.createReadStream(localFilePath);
  let s3 = new AWS.S3();
  let params = {
    Body: uploadStream,
    Bucket: credentials.bucket,
    Key: credentials.object_key,
  };

  return new Promise((resolve, reject) => {
    s3.putObject(params, function (err, data) {
      // closing stream
      if (uploadStream) {
        uploadStream.destroy();
      }

      // handling the promise outcome
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Performs dynamic video ingesting
 * @param token OAuth token to access video creation endpoint
 * @param uploadMetadata brightcove upload metadata
 * @param videoId brightcove video identifier
 * @returns {*|AxiosPromise}
 */
function submitDynamicIngest(token, uploadMetadata, videoId) {
  return axios({
    method: 'post',
    url: config.brightcove.getDynamicIngestUrl(videoId),
    data: {
      master: {
        url: uploadMetadata.api_request_url,
      },
    },
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}

/**
 * Uploads local video to brightcove
 * @param sourceVideoRecord video record object that contains video ID and local file path to upload
 */
function upload(sourceVideoRecord) {
  logger.info(`Starting video upload flow for ${JSON.stringify(sourceVideoRecord)}`);

  let authToken = '',
    videoId = '',
    uploadMetadataResult = null,
    tokenExpireTs = 0;

  return new Promise((resolve, reject) => {
    obtainAccessToken()
      .then((res) => {
        logger.info('Successfully obtained token');
        tokenExpireTs = timeUtils.getUnixTime() + res.data.expires_in;
        return (authToken = res.data.access_token);
      })
      .then((token) => {
        return createVideo(token);
      })
      .then((videoResponse) => {
        logger.info(`Successfully created upload descriptor with ID ${videoResponse.data.id}`);
        videoId = videoResponse.data.id;
        return obtainUploadUrl(authToken, videoId, sourceVideoRecord.id);
      })
      .then((urlResponse) => {
        logger.info(`Successfully obtained upload metadata: ${JSON.stringify(urlResponse.data)}`);
        return urlResponse.data;
      })
      .then((uploadMetadata) => {
        logger.info('Going to upload to S3');
        uploadMetadataResult = uploadMetadata;
        return uploadFile(sourceVideoRecord.localVideoPath, uploadMetadata);
      })
      .then((s3UploadResult) => {
        // upload to s3 may take a lot of time
        // during this time token may expire and we may need to re-issue it
        if (timeUtils.getUnixTime() >= tokenExpireTs) {
          return obtainAccessToken().then((res) => {
            tokenExpireTs = timeUtils.getUnixTime() + res.data.expires_in;
            authToken = res.data.access_token;
            return s3UploadResult;
          });
        }
        return s3UploadResult;
      })
      .then((s3UploadResult) => {
        logger.info('Going to submit dynamic ingest request');
        return submitDynamicIngest(authToken, uploadMetadataResult, videoId);
      })
      .then((diResponse) => {
        logger.info(`Successfully ingested video with ID: ${diResponse.data.id}`);
        let result = {
          brightcove: {
            videoId: videoId,
            ingestId: diResponse.data.id,
            metadata: uploadMetadataResult,
          },
        };

        // removing local file
        fs.unlinkSync(sourceVideoRecord.localVideoPath);

        resolve(result);
      })
      .catch((error) => {
        logger.error(
          `Unable to upload video for ${JSON.stringify(sourceVideoRecord)}. Message: ${
            error.message
          }`,
        );
        reject(error);
      });
  });
}

function verifyUpload(videoId) {
  return new Promise((resolve, reject) => {
    obtainRemoteVideo(videoId)
      .then((video) => {
        let thumbnailUrl = video.data.thumbnail,
          posterUrl = video.data.poster;

        let mp4Videos = _.filter(video.data.sources, { container: 'MP4' });
        let mp4HttpSrc = _.find(mp4Videos, (obj) => /^http:/.test(obj.src)),
          mp4HttpsSrc = _.find(mp4Videos, (obj) => /^https:/.test(obj.src));

        if (mp4HttpSrc || mp4HttpsSrc) {
          resolve({
            thumbnailUrl: thumbnailUrl,
            posterUrl: posterUrl,
            videoUrl: mp4HttpsSrc ? mp4HttpsSrc.src : mp4HttpSrc.src,
            updateDate: Date.now(),
          });
        } else {
          resolve(null);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

module.exports = {
  upload: upload,
  verifyUpload: verifyUpload,
  updateVideoMetadata: updateVideoMetadata,
  addVideoToExistingFolder: addVideoToExistingFolder,
  getFolderIdByName: getFolderIdByName,
  obtainAccessToken: obtainAccessToken,
};
