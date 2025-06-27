const router = require('express').Router();
const authn = require('../auth/authn');
const logger = require('../../services/logger').instance;
const matchService = require('../../services/match');
const baseHandler = require('./base');
const _ = require('lodash');

/**
 * Retrieves learning-content by pitch review
 */
router.get(
  '/learning-content/:pitchId/:reviewId',
  [
    // firebase authentication
    authn.firebase,
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId,
      reviewId = req.params.reviewId,
      currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req);
    logger.info(
      `Got request to fetch learning content for pitch ${pitchId} review ${reviewId} from ${currentUser.email}`,
    );

    matchService
      .searchLearningContent(currentUser, pitchId, reviewId, paging.skip, paging.pageSize)
      .then((foundVideos) => {
        let objects = _.map(foundVideos.objects, function (item) {
          return item.filterOut(currentUser);
        });

        foundVideos.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: foundVideos.paging });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to retrieve learning content for pitch ${pitchId} review ${reviewId}`,
          next,
        );
      });
  },
);

module.exports = router;
