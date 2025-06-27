let chai = require('chai');
let chaiHttp = require('chai-http');
let initSpec = require('./init.spec');

chai.use(chaiHttp);

it('ping should respond with pong', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/dev/ping')
    .end((err, res) => {
      res.body.should.have.property('payload').eql('pong');
      done();
    });
});

it('404 response', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/dev/errors/404')
    .end((err, res) => {
      res.statusCode.should.equal(404);
      res.body.should.have.property('errors').eql(['Object of type undefined has not been found']);
      done();
    });
});

it('500 response', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/dev/errors/500')
    .end((err, res) => {
      res.statusCode.should.equal(500);
      res.body.should.have.property('errors').eql(['Internal server error']);
      done();
    });
});

it('409 response', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/dev/errors/409')
    .end((err, res) => {
      res.statusCode.should.equal(409);
      res.body.should.have.property('errors').eql(['Object undefined already exists']);
      done();
    });
});

it('403 response', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/dev/errors/403')
    .end((err, res) => {
      res.statusCode.should.equal(403);
      res.body.should.have
        .property('errors')
        .eql(['User does not have access to the requested resource']);
      done();
    });
});

it('401 response', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/dev/errors/401')
    .end((err, res) => {
      res.statusCode.should.equal(401);
      res.body.should.have.property('errors').eql(['Unauthorized']);
      done();
    });
});
