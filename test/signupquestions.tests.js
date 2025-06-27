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

it('getting signup-questions', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/signup-questions`)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(3);

      let objectsExtraction = _.map(payload, function (v) {
        return { key: v.key, type: v.type, question: v.question, answers: v.answers };
      });

      expect(objectsExtraction).to.have.deep.members([
        {
          key: 'iAm',
          type: 'single',
          question: 'I am an',
          answers: [
            { title: 'Entrepreneur', value: 'entrepreneur' },
            { title: 'Investor', value: 'investor' },
            { title: 'Coach', value: 'coach' },
          ],
        },
        {
          key: 'myGoals',
          type: 'multi',
          question: 'What are your goals?',
          answers: [
            { title: 'Raise capital', value: 'raise-capital' },
            { title: 'Get more customers', value: 'get-more-customers' },
            { title: 'Be inspired', value: 'be-inspired' },
            { title: 'Community', value: 'community' },
            { title: 'Deal sourcing', value: 'deal-sourcing' },
          ],
        },
        {
          key: 'myStage',
          question: 'What stage would you describe your business/the businesses you work with?',
          answers: [
            { title: 'Self-funded', value: 'self-funded' },
            { title: 'Idea', value: 'idea' },
            { title: 'Pre-Seed', value: 'pre-seed' },
            { title: 'Seed', value: 'seed' },
            { title: 'Series A', value: 'series-a' },
            { title: 'Series B', value: 'series-b' },
            { title: 'Series C', value: 'series-c' },
          ],
          type: 'single',
        },
      ]);
      done();
    });
});
