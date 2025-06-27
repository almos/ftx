const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const base = require('./helpers/base');
const _ = require('lodash');
chai.use(chaiHttp);

/**
 * Permission checks
 */
it('firebase token is required to access community search endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/community/search')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('firebase token is required to access community search by communityPostId endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/community/60f6f882ff081139a1e568b9')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('firebase token is required to access community creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/community')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it("firebase token is required to access community editing community's post endpoint", (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/community/60f6f882ff081139a1e568b9')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it("firebase token is required to access community delete community's post endpoint", (done) => {
  chai
    .request(initSpec.getServer())
    .delete('/api/community/60f6f882ff081139a1e568b9')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

/**
 * Functional checks
 */
it('Create community post via non-admin', (done) => {
  let communityPostInsert = {
    title: 'Title unit test01',
    description:
      'The data for describe or explain about something related the title feed. unit test 01',
    url: 'https://wwww.google.com',
    tags: ['aws', 'google'],
    pushNotifications: true,
  };

  chai
    .request(initSpec.getServer())
    .put(`/api/community`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send(communityPostInsert)
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      done();
    });
});

it('create community post via admin with title data is empty', (done) => {
  let communityPostInsert = {
    title: '',
    description:
      'The data for describe or explain about something related the title feed. unit test 01',
    url: 'https://wwww.google.com',
    tags: ['aws', 'google'],
    pushNotifications: true,
  };

  chai
    .request(initSpec.getServer())
    .put(`/api/community`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(communityPostInsert)
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('create community post via admin with title data is undefined', (done) => {
  let communityPostInsert = {
    description:
      'The data for describe or explain about something related the title feed. unit test 01',
    url: 'https://wwww.google.com',
    tags: ['aws', 'google'],
    pushNotifications: true,
  };

  chai
    .request(initSpec.getServer())
    .put(`/api/community`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(communityPostInsert)
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('create community post via admin with tag data is not array', (done) => {
  let communityPostInsert = {
    title: 'Title unit test01',
    description:
      'The data for describe or explain about something related the title feed. unit test 01',
    url: 'https://wwww.google.com',
    tags: 'google',
    pushNotifications: true,
  };

  chai
    .request(initSpec.getServer())
    .put(`/api/community`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(communityPostInsert)
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

// it('create community post via admin with title perfect data.',(done)=>{
// TODO Create success test cases
// });
