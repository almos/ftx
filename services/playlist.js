const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const _ = require('lodash');
const genericDal = require('./dal/generic');
const commonDal = require('../models/common');

/**
 * Creates a playlist
 */
function createPlaylist(playlistObject, creatorRole) {
  return genericDal.createOne(Playlist, playlistObject, creatorRole);
}

/**
 * Finds a playlist in database by an internal ID
 */
function findById(id) {
  return genericDal.findOne(Playlist, { _id: id });
}

/**
 * Updates existing playlist
 */
function updatePlaylist(playlistId, updatedPlaylist, updatorRole) {
  return genericDal.updateOne(Playlist, playlistId, updatedPlaylist, updatorRole);
}

/**
 * Generic playlist search implementation in database
 */
function findManyImpl(searchCriteria, skip, limit) {
  return genericDal.findAll(Playlist, searchCriteria, skip, limit);
}

/**
 * Search for playlists
 */
function search(queryString, tags, publicOnly, skip, limit, sub) {
  let criteria = [],
    populate = undefined,
    projection = undefined;

  if (queryString) {
    criteria.push({
      $or: [
        { $text: { $search: queryString } },
        { title: { $regex: queryString, $options: 'i' } },
        { description: { $regex: queryString, $options: 'i' } },
        { tags: { $in: commonDal.processTags(_.split(queryString, ' ')) } },
      ],
    });
  }

  if (publicOnly) {
    criteria.push({ public: true });
  }

  if (tags) {
    criteria.push({ tags: { $in: commonDal.processTags(tags) } });
  }

  if (sub) {
    populate = {
      path: 'videos',
      select: 'title description video.thumbnailUrl video.posterUrl accessGroups likesCount',
    };
  }

  return genericDal.findAllPaginated(
    Playlist,
    criteria.length ? { $and: criteria } : {},
    skip,
    limit,
    null,
    projection,
    populate,
  );
}

function setPlaylistThumbnail(playlistId, thumbnailUrl, updatorRole) {
  return updatePlaylist(playlistId, { previewImageUrl: thumbnailUrl }, updatorRole);
}

module.exports = {
  createPlaylist: createPlaylist,
  updatePlaylist: updatePlaylist,
  findById: findById,
  search: search,
  setPlaylistThumbnail: setPlaylistThumbnail,
  findMany: findManyImpl,
};
