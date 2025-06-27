function checkBaseSuccessResponse(res) {
  res.should.have.status(200);
  res.should.be.json;
  res.body.should.have.property('payload');
  res.body.should.not.have.property('errors');
}

function checkBaseUnathorizeResponse(res) {
  res.should.have.status(401);
  res.should.be.json;

  res.body.should.have.property('errors').eql(['Unauthorized']);
  res.body.should.not.have.property('payload');
}

function checkBaseUserRestrictionResponse(res) {
  res.should.have.status(403);
  res.should.be.json;

  res.body.should.not.have.property('payload');
  res.body.should.have
    .property('errors')
    .eql(['User does not have access to the requested resource']);
}

function checkBaseFailResponse(res, expectedCode, checkErrors) {
  res.should.have.status(expectedCode);
  res.should.be.json;
  res.body.should.not.have.property('payload');
  res.body.should.have.property('errors');

  if (checkErrors) {
    res.body.should.have.property('errors').eql(checkErrors);
  }
}

module.exports = {
  checkSuccessResponse: checkBaseSuccessResponse,
  checkBaseUnathorizeResponse: checkBaseUnathorizeResponse,
  checkBaseUserRestrictionResponse: checkBaseUserRestrictionResponse,
  checkFailResponse: checkBaseFailResponse,
};
