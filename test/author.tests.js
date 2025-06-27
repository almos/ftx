const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const request = require('request');
const base = require('./helpers/base');
const _ = require('lodash');

chai.use(chaiHttp);
let expect = chai.expect;

let authorCreateRequestPayload = {
  name: 'Alan',
  surname: 'Blant',
  title: 'CEO',
  description: 'Blabla',
};

/**
 * Permission checks
 */

it('firebase token is required to access author creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/author')
    .send(authorCreateRequestPayload)
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('firebase token is required to access author search endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/author/search')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('firebase token is required to retrieve author by ID', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/author/fakeID')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('firebase token is required to access author update endpoint by ID', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/author/fakeID')
    .send({ name: 'Jonatan', title: 'CIO' })
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('firebase token is required to upload an avatar for author', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/author/avatar/fakeID')
    .attach('image', './test/test-avatar.png', 'test-avatar.png')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('founder cannot create an author', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/author')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(authorCreateRequestPayload)
    .end((err, res) => {
      res.should.have.status(403);
      res.should.be.json;
      res.body.should.not.have.property('payload');

      done();
    });
});

it('investor cannot create an author', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/author')
    .set({ AuthToken: initSpec.getInvestor().token })
    .send(authorCreateRequestPayload)
    .end((err, res) => {
      res.should.have.status(403);
      res.should.be.json;
      res.body.should.not.have.property('payload');

      done();
    });
});

/**
 * Functional checks
 */

it('admin can create an author', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/author')
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(authorCreateRequestPayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('name').eql(authorCreateRequestPayload.name);
      payload.should.have.property('surname').eql(authorCreateRequestPayload.surname);
      payload.should.have.property('title').eql(authorCreateRequestPayload.title);
      payload.should.have.property('description').eql(authorCreateRequestPayload.description);

      done();
    });
});

it('admin updates existing author', (done) => {
  async.waterfall(
    [
      // first step: updating author
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/author/600168bcaae4412eec424ec1`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({ name: 'Jonatan', title: 'CIO' })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null, res.body.payload);
          }),
      // second step: getting the updated author
      (author, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/author/600168bcaae4412eec424ec1`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('name').eql('Jonatan');
            payload.should.have.property('surname').eql('Smith');
            payload.should.have.property('title').eql('CIO');
            cb();
          }),
    ],
    done,
  );
});

it('admin uploads and removes an avatar', (done) => {
  async.waterfall(
    [
      // first step: uploading an avatar
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/author/avatar/600168bcaae4412eec424ec1`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .attach('image', './test/test-avatar.png', 'test-avatar.png')
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('avatarUrl');
            cb(null, res.body.payload);
          }),
      // second step: checking if avatar is uploaded
      (author, cb) => {
        request(author.avatarUrl, {}, function (err, res) {
          res.should.have.status(200);
          cb(null, author);
        });
      },
      // third step: removing the avatar
      (author, cb) => {
        chai
          .request(initSpec.getServer())
          .delete(`/api/author/avatar/${author.id}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('avatarUrl').eql(null);
            cb();
          });
      },
    ],
    done,
  );
});

/**
 * Search tests
 */

it('admin searches authors no filter default paging', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/author/search')
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

it('admin searches authors with page size 2', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/author/search?pageSize=2')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(2);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(4);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(2);
      paging.should.have.property('hasNextPage').eql(true);
      paging.should.have.property('pageSize').eql(2);
      done();
    });
});

it('admin searches authors with page size 2, items should be unique', (done) => {
  async.waterfall(
    [
      // first step: getting 1st page
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/author/search?pageSize=2`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let authorIds = _.map(res.body.payload, function (v) {
              return v.id;
            });

            cb(null, authorIds);
          }),
      // second step: getting 2nd page
      (firstPageIds, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/author/search?pageSize=2&page=2`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let secondPageIds = _.map(res.body.payload, function (v) {
              return v.id;
            });

            // object IDs across pages should be unique
            expect(_.intersection(secondPageIds, firstPageIds)).to.be.an('array').that.is.empty;

            let paging = res.body.paging;
            paging.should.have.property('hasNextPage').eql(false);

            cb();
          }),
    ],
    done,
  );
});

it('admin searches authors by name', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/author/search?q=david')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.payload.should.have.lengthOf(2);

      let objectsExtraction = _.map(res.body.payload, function (v) {
        return { name: v.name, surname: v.surname };
      });

      expect(objectsExtraction).to.have.deep.members([
        { name: 'John-David', surname: 'Woodard' },
        { name: 'David', surname: 'Smith' },
      ]);

      let paging = res.body.paging;
      paging.should.have.property('hasNextPage').eql(false);
      done();
    });
});

it('admin searches authors by title', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/author/search?q=ceo')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      res.body.payload.should.have.lengthOf(2);
      done();
    });
});

it('admin searches authors by surname', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/author/search?q=hump')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      res.body.payload.should.have.lengthOf(1);
      done();
    });
});

it('admin searches authors by description', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/author/search?q=coffee')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      res.body.payload.should.have.lengthOf(2);
      done();
    });
});
