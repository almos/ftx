const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const request = require('request');
const base = require('./helpers/base');
const _ = require('lodash');

chai.use(chaiHttp);
let expect = chai.expect;

const playlistCreateRequestPayload = {
  title: 'My playlist',
  description: 'Description for playlist',
  tags: ['business idea'],
  videos: ['5fd6279d7ecb79a13e2e8ec1', '5fd6279d7ecb79a13e2e8ec2'],
  autoPlay: false,
  companyPlaylist: false,
};

const existPlaylistId = '600880a5a571a2ad3d278233';

/**
 * Authentification checks
 */

it('firebase token is required to access playlist creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/playlist')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access playlist updating endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/playlist/fakeID')
    .send({
      title: 'My playlist with updated title',
      description: 'My playlist with updated description',
    })
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to upload thumbnail for playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/playlist/${existPlaylistId}/thumbnail`)
    .attach('image', './test/test-thumbnail.jpg', 'test-thumbnail.jpg')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to get existing playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/fakeID')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access playlist search endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access public playlist search endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search/all')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

/**
 * Endpoints forbiden for investor an founder checks
 */

it('founder cannot create a playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/playlist')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(playlistCreateRequestPayload)
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);

      done();
    });
});

it('investor cannot create a playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/playlist')
    .set({ AuthToken: initSpec.getInvestor().token })
    .send(playlistCreateRequestPayload)
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);

      done();
    });
});

it('founder cannot update existing playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/playlist/${existPlaylistId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send({
      title: 'My playlist with updated title',
      description: 'My playlist with updated description',
    })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);

      done();
    });
});

it('investor cannot update existing playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/playlist/${existPlaylistId}`)
    .set({ AuthToken: initSpec.getInvestor().token })
    .send({
      title: 'My playlist with updated title',
      description: 'My playlist with updated description',
    })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);

      done();
    });
});

it('founder cannot upload thumbnail for playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/playlist/${existPlaylistId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .attach('image', './test/test-thumbnail.jpg', 'test-thumbnail.jpg')
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);

      done();
    });
});

it('investor cannot uplode thumbnail for playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/playlist/${existPlaylistId}`)
    .set({ AuthToken: initSpec.getInvestor().token })
    .attach('image', './test/test-thumbnail.jpg', 'test-thumbnail.jpg')
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);

      done();
    });
});

it('founder cannot make all playlists search', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/playlist/search/all`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);

      done();
    });
});

it('investor cannot make all playlist search', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/playlist/search/all`)
    .set({ AuthToken: initSpec.getInvestor().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);

      done();
    });
});

/**
 * Functional checks
 */

it('admin can create a playlist', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/playlist')
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(playlistCreateRequestPayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql(playlistCreateRequestPayload.title);
      payload.should.have.property('description').eql(playlistCreateRequestPayload.description);
      payload.should.have.property('tags').eql(playlistCreateRequestPayload.tags);
      payload.should.have.property('videos').eql(playlistCreateRequestPayload.videos);
      payload.should.have.property('autoPlay').eql(playlistCreateRequestPayload.autoPlay);
      payload.should.have
        .property('companyPlaylist')
        .eql(playlistCreateRequestPayload.companyPlaylist);

      done();
    });
});

it('admin uploads thumbnail for existing playlist', (done) => {
  async.waterfall(
    [
      // first step: uploading playlist thumbnail
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/playlist/${existPlaylistId}/thumbnail`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .attach('image', './test/test-thumbnail.jpg', 'test-thumbnail.jpg')
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('previewImageUrl');
            cb(null, res.body.payload);
          }),
      // second step: checking if playlist thumbnail is uploaded
      (playlist, cb) => {
        request(playlist.previewImageUrl, {}, function (err, res) {
          res.should.have.status(200);
          cb();
        });
      },
    ],
    done,
  );
});

it('admin updates an existing playlist', (done) => {
  async.waterfall(
    [
      // first step: updating playlist
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/playlist/${existPlaylistId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({
            title: 'My playlist with updated title',
            description: 'My playlist with updated description',
            videos: ['5fd6279d7ecb79a13e2e8ec1'],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null, res.body.payload);
          }),
      // second step: getting the updated playlist
      (playlist, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/playlist/${existPlaylistId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('title').eql('My playlist with updated title');
            payload.should.have.property('description').eql('My playlist with updated description');

            payload.should.have.property('videos').eql(['5fd6279d7ecb79a13e2e8ec1']);
            payload.should.have.property('tags').eql(['busines idea']);
            payload.should.have.property('autoPlay').eql(false);
            payload.should.have.property('companyPlaylist').eql(false);
            cb();
          }),
    ],
    done,
  );
});

/**
 * Search tests
 */
it('founder searches through public playlists', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(3);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(3);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(1);
      paging.should.have.property('hasNextPage').eql(false);
      paging.should.have.property('pageSize').eql(10);
      done();
    });
});

it('admin searches playlists with no filter and with default paging', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search/all')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(4);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(4);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(1);
      paging.should.have.property('hasNextPage').eql(false);
      paging.should.have.property('pageSize').eql(10);
      done();
    });
});

it('admin searches playlists with page size 2', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search?pageSize=2')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(2);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(3);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(2);
      paging.should.have.property('hasNextPage').eql(true);
      paging.should.have.property('pageSize').eql(2);
      done();
    });
});

it('admin searches playlists by description', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search?q=youtube')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property(
        '[0].description',
        'YouTube channel about exotic animals and plants',
      );
      done();
    });
});

it('admin searches playlists by title', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search?q=science')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].title', 'Natural Science');
      done();
    });
});

it('admin searches playlists by tags', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search?tags[]=education')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.payload.should.have.lengthOf(2);

      let objectsExtraction = _.map(res.body.payload, function (v) {
        return { title: v.title, tags: v.tags };
      });

      expect(objectsExtraction).to.have.deep.members([
        { title: 'Online teaching from home', tags: ['education', 'busines idea'] },
        { title: 'Natural Science', tags: ['education', 'science'] },
      ]);

      let paging = res.body.paging;
      paging.should.have.property('hasNextPage').eql(false);
      done();
    });
});

it('admin searches playlists by sub parameter', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search?sub=true')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(3);
      payload.should.have.deep.nested.property('[0].videos[0]').that.is.a('object');
      done();
    });
});

it('admin searches playlists by query string and by tags', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/playlist/search?q=science&tags[]=education')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].title', 'Natural Science');
      payload.should.have.deep.nested.property('[0].tags', ['education', 'science']);

      let paging = res.body.paging;
      paging.should.have.property('hasNextPage').eql(false);
      done();
    });
});
