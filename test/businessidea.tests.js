const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const request = require('request');
const base = require('./helpers/base');
const _ = require('lodash');

chai.use(chaiHttp);
let expect = chai.expect;

let businessIdeaCreatePayload = {
  title: 'My super-duper business idea',
  description: 'To rule the world',
  logo: 'https://testlogo.com',
  websiteUrl: 'https://testwebsite.com',
  industries: ['test industries'],
  location: ['test location'],
  stage: 'Series A',
  language: 'en',
};

it('firebase token is required to create a business idea', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/business-idea')
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('founder creates a business idea', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/business-idea')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql(businessIdeaCreatePayload.title);
      payload.should.have.property('description').eql(businessIdeaCreatePayload.description);
      payload.should.have.property('logo').eql(businessIdeaCreatePayload.logo);
      payload.should.have.property('websiteUrl').eql(businessIdeaCreatePayload.websiteUrl);
      payload.should.have.property('industries').eql(businessIdeaCreatePayload.industries);
      payload.should.have.property('location').eql(businessIdeaCreatePayload.location);
      payload.should.have.property('stage').eql(businessIdeaCreatePayload.stage);
      payload.should.have.property('language').eql('en');
      payload.should.have.property('visibleTenants').eql(['global']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);

      done();
    });
});

it('founder creates a business idea with a group he is not a member of', (done) => {
  let payload = Object.assign(businessIdeaCreatePayload, {
    visibilityGroups: ['602d61a214c6fd937c1ac9a5'],
  });

  chai
    .request(initSpec.getServer())
    .put('/api/business-idea')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(payload)
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('hidden organization tenanted founder creates a business idea', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/business-idea')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql(businessIdeaCreatePayload.title);
      payload.should.have.property('description').eql(businessIdeaCreatePayload.description);
      payload.should.have.property('logo').eql(businessIdeaCreatePayload.logo);
      payload.should.have.property('websiteUrl').eql(businessIdeaCreatePayload.websiteUrl);
      payload.should.have.property('industries').eql(businessIdeaCreatePayload.industries);
      payload.should.have.property('location').eql(businessIdeaCreatePayload.location);
      payload.should.have.property('stage').eql(businessIdeaCreatePayload.stage);
      payload.should.have.property('visibleTenants').eql(['tef']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a5']);

      done();
    });
});

it('hidden organization tenanted founder creates a business idea with an org-level visibility', (done) => {
  let payload = Object.assign(businessIdeaCreatePayload, {
    visibilityGroups: ['602d61a214c6fd937c1ac9a4'],
  });

  chai
    .request(initSpec.getServer())
    .put('/api/business-idea')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .send(payload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql(businessIdeaCreatePayload.title);
      payload.should.have.property('description').eql(businessIdeaCreatePayload.description);
      payload.should.have.property('logo').eql(businessIdeaCreatePayload.logo);
      payload.should.have.property('websiteUrl').eql(businessIdeaCreatePayload.websiteUrl);
      payload.should.have.property('industries').eql(businessIdeaCreatePayload.industries);
      payload.should.have.property('location').eql(businessIdeaCreatePayload.location);
      payload.should.have.property('stage').eql(businessIdeaCreatePayload.stage);
      payload.should.have.property('visibleTenants').eql(['tef']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a4']);

      done();
    });
});

it('founder finds a business idea he owns', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/business-idea/5fd68a71da1aa9e14920723d')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql('Business idea 1 of a founder user');
      payload.should.have
        .property('description')
        .eql('The quick brown fox jumps over the lazy dog');
      payload.should.have.property('visibleTenants').eql(['global']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);

      done();
    });
});

it('hidden organization tenanted founder finds a business idea he owns', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/business-idea/5fd68a71da1aa9e14920723f')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql('Business idea 1 of a tenanted founder user');
      payload.should.have
        .property('description')
        .eql(
          'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum',
        );

      done();
    });
});

it('another founder finds a business idea he does not own', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/business-idea/5fd68a71da1aa9e14920723d')
    .set({ AuthToken: initSpec.getSecondFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql('Business idea 1 of a founder user');
      payload.should.have
        .property('description')
        .eql('The quick brown fox jumps over the lazy dog');
      payload.should.have.property('visibleTenants').eql(['global']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);

      done();
    });
});

it('hidden organization tenanted founder finds a business idea inside of tenant he does not own', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/business-idea/5fd68a71da1aa9e149207240')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql('Business idea 1 of a tenanted founder user 2');
      payload.should.have
        .property('description')
        .eql('Et harum quidem rerum facilis est et expedita distinctio');

      done();
    });
});

it('hidden organization tenanted founder finds a business idea outside of tenant he does not own', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/business-idea/5fd68a71da1aa9e14920723d')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 404);
      done();
    });
});

it('founder modifies a business idea he owns', (done) => {
  delete businessIdeaCreatePayload.visibilityGroups;
  chai
    .request(initSpec.getServer())
    .post('/api/business-idea/5fd68a71da1aa9e14920723d')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql(businessIdeaCreatePayload.title);
      payload.should.have.property('description').eql(businessIdeaCreatePayload.description);
      payload.should.have.property('logo').eql(businessIdeaCreatePayload.logo);
      payload.should.have.property('websiteUrl').eql(businessIdeaCreatePayload.websiteUrl);
      payload.should.have.property('industries').eql(businessIdeaCreatePayload.industries);
      payload.should.have.property('location').eql(businessIdeaCreatePayload.location);
      payload.should.have.property('stage').eql(businessIdeaCreatePayload.stage);
      payload.should.have.property('visibleTenants').eql(['global']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);

      done();
    });
});

it('founder modifies a business idea he owns with invalid stage', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/business-idea/5fd68a71da1aa9e14920723d')
    .set({ AuthToken: initSpec.getFounder().token })
    .send({
      title: 'test title',
      description: 'test description',
      stage: 'test stage',
    })
    .end((err, res) => {
      let errors = res.body.errors;
      for (const obj of errors) {
        obj.should.have.property('stage').eql('invalid value');
      }
      done();
    });
});

it('hidden organization tenanted founder modifies a business idea he owns', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/business-idea/5fd68a71da1aa9e14920723f')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql(businessIdeaCreatePayload.title);
      payload.should.have.property('description').eql(businessIdeaCreatePayload.description);
      payload.should.have.property('logo').eql(businessIdeaCreatePayload.logo);
      payload.should.have.property('websiteUrl').eql(businessIdeaCreatePayload.websiteUrl);
      payload.should.have.property('industries').eql(businessIdeaCreatePayload.industries);
      payload.should.have.property('location').eql(businessIdeaCreatePayload.location);
      payload.should.have.property('stage').eql(businessIdeaCreatePayload.stage);
      payload.should.have.property('visibleTenants').eql(['tef']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a5']);

      done();
    });
});

it('founder modifies a business idea he does not own', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/business-idea/5fd68a71da1aa9e14920723e')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      done();
    });
});

it('hidden organization tenanted founder modifies a business idea he does not own', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/business-idea/5fd68a71da1aa9e149207240')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      done();
    });
});

it('founder modifies a non-existent business idea', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/business-idea/5fd68a71da1aa9e149207230')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      res.should.have.status(404);
      res.should.be.json;
      res.body.should.not.have.property('payload');

      done();
    });
});

it('founder gets own business ideas', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/business-idea/my')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);
      res.body.payload.should.have.lengthOf(3);

      let objectsExtraction = _.map(res.body.payload, (v) => {
        return { id: v.id };
      });

      expect(objectsExtraction).to.have.deep.members([
        { id: '5fd68a71da1aa9e14920723d' },
        { id: '5fd68a71da1aa9e14920723c' },
        { id: '5fd68a71da1aa9e149207242' },
      ]);

      done();
    });
});

it('hidden organization tenanted founder gets own business ideas', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/business-idea/my')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .send(businessIdeaCreatePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);
      res.body.payload.should.have.lengthOf(2);

      let objectsExtraction = _.map(res.body.payload, (v) => {
        return { id: v.id };
      });

      expect(objectsExtraction).to.have.deep.members([
        { id: '5fd68a71da1aa9e14920723f' },
        { id: '5fd68a71da1aa9e149207241' },
      ]);

      done();
    });
});

/**
 * Business idea searching
 */

it('founder searches business ideas by query string', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/business-idea/search?q=Lorem`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;

      payload.should.have.lengthOf(1);
      payload[0].should.have.property('title').eql('Business idea 1 of a founder 2 user');
      done();
    });
});

it('founder searches business ideas by query string - business idea dne', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/business-idea/search?q=DNE`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;

      payload.should.have.lengthOf(0);
      done();
    });
});

it('founder searches business ideas by query string with exludeOwn=true', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/business-idea/search?excludeOwn=true&q=Lorem`)
    .set({ AuthToken: initSpec.getSecondFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;

      payload.should.have.lengthOf(0);
      done();
    });
});

it('founder searches the business ideas with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/business-idea/search?sub=true`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let expectedObject = _.find(res.body.payload, { id: '5fd68a71da1aa9e14920723e' });

      expectedObject.should.have.property('userId');
      expectedObject.userId.should.not.have.property('marketingConsentTimestamp');
      expectedObject.userId.should.not.have.property('theme');
      expectedObject.userId.should.not.have.property('watchedVideos');
      expectedObject.userId.should.not.have.property('hasMarketingConsent');
      expectedObject.userId.should.not.have.property('paid');
      expectedObject.userId.should.not.have.property('firebaseId');
      expectedObject.userId.should.have.property('languages');
      expectedObject.userId.should.have.property('skills');
      expectedObject.userId.should.have.property('verified');

      done();
    });
});

it('founder that is joined to a group searches all the business ideas within a specific group', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/business-idea/search?excludeOwn=false&groups[]=602d61a214c6fd937c1ac9a6')
    .set({ AuthToken: initSpec.getSecondFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.payload.should.have.lengthOf(2);

      let objectsExtraction = _.map(res.body.payload, (v) => {
        return {
          id: v.id,
          userId: v.userId,
          visibleGroups: v.visibleGroups,
        };
      });

      expect(objectsExtraction).to.have.deep.members([
        {
          id: '5fd68a71da1aa9e14920723e',
          userId: '5fd61c19631e2d86c5ae9ce6',
          visibleGroups: ['602d61a214c6fd937c1ac9a6'],
        },
        {
          id: '5fd68a71da1aa9e149207242',
          userId: '5fd61c19631e2d86c5ae9ce7',
          visibleGroups: ['602d61a214c6fd937c1ac9a6'],
        },
      ]);

      done();
    });
});

it('founder that is joined to a group searches all the business ideas including own ones', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/business-idea/search?excludeOwn=false')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.payload.should.have.lengthOf(5);

      let objectsExtraction = _.map(res.body.payload, (v) => {
        return {
          id: v.id,
          userId: v.userId,
        };
      });

      expect(objectsExtraction).to.have.deep.members([
        {
          id: '5fd68a71da1aa9e14920723c',
          userId: '5fd61c19631e2d86c5ae9ce7',
        },
        {
          id: '5fd68a71da1ac9e149207234',
          userId: '5fd61c19631e2d86c5ae9ce9',
        },
        {
          id: '5fd68a71da1aa9e14920723d',
          userId: '5fd61c19631e2d86c5ae9ce7',
        },
        {
          id: '5fd68a71da1aa9e14920723e',
          userId: '5fd61c19631e2d86c5ae9ce6',
        },
        {
          id: '5fd68a71da1aa9e149207242',
          userId: '5fd61c19631e2d86c5ae9ce7',
        },
      ]);

      done();
    });
});

it('founder uploads their logo', (done) => {
  async.waterfall(
    [
      // first step: uploading an avatar
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/business-idea/logo/5fd68a71da1aa9e14920723d`)
          .set({ AuthToken: initSpec.getFounder().token })
          .attach('image', './test/test-avatar.png', 'test-avatar.png')
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('logo');
            cb(null, res.body.payload);
          }),
      // second step: checking if avatar is uploaded to google storage
      (user, cb) => {
        request(user.logo, {}, function (err, res) {
          res.should.have.status(200);
          cb(null, user);
        });
      },
    ],
    done,
  );
});
