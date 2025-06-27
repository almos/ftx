const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const base = require('./helpers/base');
const _ = require('lodash');

chai.use(chaiHttp);
let expect = chai.expect;

/**
 * Functional checks
 */

it('getting review-categories', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/review-categories`)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(6);

      let objectsExtraction = _.map(res.body.payload, function (v) {
        return { title: v.title, alias: v.alias };
      });

      expect(objectsExtraction).to.have.deep.members([
        { title: 'Purpose', alias: 'purpose' },
        { title: 'Problem', alias: 'problem' },
        { title: 'Solution', alias: 'solution' },
        { title: 'Timing', alias: 'timing' },
        { title: 'Market potential', alias: 'marketPotential' },
        { title: 'Competition', alias: 'competition' },
      ]);
      done();
    });
});
