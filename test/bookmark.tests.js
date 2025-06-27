const chai = require('chai');
const chaiHttp = require('chai-http');
const _ = require('lodash');
const async = require('async');
chai.use(chaiHttp);
const initSpec = require('./init.spec');
const base = require('./helpers/base');
const bookmarkTypes = require('../config/bookmark').bookmarkTypes;
const bookmarkModels = require('../config/bookmark').bookmarkModels;

it('firebase token is required to create a bookmark', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/bookmark/founder/${initSpec.getFounder().id}`)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to get a bookmark', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/bookmark`)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to get a bookmark with filter', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/bookmark/mentor`)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to delete a bookmark', (done) => {
  chai
    .request(initSpec.getServer())
    .delete(`/api/bookmark/${initSpec.getFounder().id}`)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

/**
 * Functional Checks
 */

it('Create a bookmark founder type', (done) => {
  async.waterfall([
    // first step: create new founder bookmark
    (cb) =>
      chai
        .request(initSpec.getServer())
        .put(`/api/bookmark/founder/${initSpec.getSecondFounder().id}`)
        .set({ AuthToken: initSpec.getFounder().token })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          let payload = res.body.payload;
          payload.should.have.property('userId').eql(initSpec.getFounder().id);
          payload.should.have.property('bookmarkedObjectId').eql(initSpec.getSecondFounder().id);
          payload.should.have.property('type').eql(bookmarkTypes.FOUNDER);
          payload.should.have.property('onModel').eql(bookmarkModels.USER);
          cb();
        }),
    // second step: create a duplicate
    (cb) =>
      chai
        .request(initSpec.getServer())
        .put(`/api/bookmark/founder/${initSpec.getSecondFounder().id}`)
        .set({ AuthToken: initSpec.getFounder().token })
        .end((err, res) => {
          base.checkFailResponse(res, 422);
          cb();
        }),
    // third step: create investor
    (cb) =>
      chai
        .request(initSpec.getServer())
        .put(`/api/bookmark/investor/${initSpec.getInvestor().id}`)
        .set({ AuthToken: initSpec.getFounder().token })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          let payload = res.body.payload;
          payload.should.have.property('userId').eql(initSpec.getFounder().id);
          payload.should.have.property('bookmarkedObjectId').eql(initSpec.getInvestor().id);
          payload.should.have.property('type').eql(bookmarkTypes.INVESTOR);
          payload.should.have.property('onModel').eql(bookmarkModels.USER);
          cb();
        }),
    // fourth step: add pitch
    (cb) =>
      chai
        .request(initSpec.getServer())
        .put(`/api/bookmark/pitch/5fda324aee1965396cadd0d1`)
        .set({ AuthToken: initSpec.getFounder().token })
        .end((err, res) => {
          base.checkSuccessResponse(res);
          let payload = res.body.payload;
          payload.should.have.property('userId').eql(initSpec.getFounder().id);
          payload.should.have.property('bookmarkedObjectId').eql('5fda324aee1965396cadd0d1');
          payload.should.have.property('type').eql(bookmarkTypes.PITCH);
          payload.should.have.property('onModel').eql(bookmarkModels.PITCH);
          cb();
        }),
    // fifth step: Check all bookmarks
    (cb) =>
      chai
        .request(initSpec.getServer())
        .get(`/api/bookmark`)
        .set({ AuthToken: initSpec.getFounder().token })
        .end((err, res) => {
          base.checkSuccessResponse(res);
          chai.assert(res.body.payload.length === 3);
          let payload = res.body.payload;
          payload[0].should.have.property('userId').eql(initSpec.getFounder().id);
          payload[0].bookmarkedObjectId.should.have
            .property('id')
            .eql(initSpec.getSecondFounder().id);
          payload[0].bookmarkedObjectId.should.not.have.property('firebaseId');
          payload[0].should.have.property('type').eql(bookmarkTypes.FOUNDER);
          payload[0].should.have.property('onModel').eql(bookmarkModels.USER);

          payload[1].should.have.property('userId').eql(initSpec.getFounder().id);
          payload[1].bookmarkedObjectId.should.have.property('id').eql(initSpec.getInvestor().id);
          payload[1].bookmarkedObjectId.should.not.have.property('firebaseId');
          payload[1].should.have.property('type').eql(bookmarkTypes.INVESTOR);
          payload[1].should.have.property('onModel').eql(bookmarkModels.USER);

          payload[2].should.have.property('userId').eql(initSpec.getFounder().id);
          payload[2].bookmarkedObjectId.should.have.property('id').eql('5fda324aee1965396cadd0d1');
          payload[2].should.have.property('type').eql(bookmarkTypes.PITCH);
          payload[2].should.have.property('onModel').eql(bookmarkModels.PITCH);
          done();
        }),
  ]);
});

it('Create bookmark with incorrect type', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/bookmark/notatype/${initSpec.getInvestor().id}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('Create bookmark investor type', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/bookmark/investor/${initSpec.getInvestor().id}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.property('userId').eql(initSpec.getFounder().id);
      payload.should.have.property('bookmarkedObjectId').eql(initSpec.getInvestor().id);
      payload.should.have.property('type').eql(bookmarkTypes.INVESTOR);
      payload.should.have.property('onModel').eql(bookmarkModels.USER);
      done();
    });
});

it('Create bookmark pitch type', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/bookmark/pitch/5fda324aee1965396cadd0d1`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.property('userId').eql(initSpec.getFounder().id);
      payload.should.have.property('bookmarkedObjectId').eql('5fda324aee1965396cadd0d1');
      payload.should.have.property('type').eql(bookmarkTypes.PITCH);
      payload.should.have.property('onModel').eql(bookmarkModels.PITCH);
      done();
    });
});

it('Create bookmark pitch type object does not exist', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/bookmark/pitch/5fda324aee1965396cadd0e1`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 404);
      done();
    });
});

it('Create bookmark user type object does not exist', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/bookmark/investor/5fda324aee1965396cadd0e1`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 404);
      done();
    });
});
