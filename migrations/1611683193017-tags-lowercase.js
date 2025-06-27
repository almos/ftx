const mongoose = require('mongoose');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

let videoService = require('../services/video');
let pitchService = require('../services/pitch');
let playlistService = require('../services/playlist');
const _ = require('lodash');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;

  // we just send same tags as is, as mongoose preSave logic will
  // transform tags into the proper lowercase format

  await videoService.findMany().then((videos) => {
    videos.forEach((video) => {
      videoService.updateVideo(video.id, { tags: video.tags });
    });
  });

  await pitchService.findMany().then((pitches) => {
    pitches.forEach((pitch) => {
      pitchService.updatePitches(pitch.id, { tags: pitch.tags });
    });
  });

  await playlistService.findMany().then((playlists) => {
    playlists.forEach((playlist) => {
      playlistService.updatePlaylist(playlist.id, { tags: playlist.tags });
    });
  });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
