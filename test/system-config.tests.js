const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const base = require('./helpers/base');
chai.use(chaiHttp);
let assert = chai.assert;

const SystemConfigCreationPayload = {
  groupKey: 'country',
  itemKey: 'country:sweden',
  locale: 'en',
  value: 'Sweden',
};

const SystemConfigUpdatePayload = {
  value: 'Englanf',
};

const SystemConfigUpdatedPayload = {
  groupKey: 'country',
  itemKey: 'country:england',
  locale: 'en',
  value: 'Englanf',
};

const SystemConfigCreationPayloadSwedenInFrench = {
  groupKey: 'country',
  itemKey: 'country:sweden',
  locale: 'fr',
  value: 'French Sweden',
};

const IncompleteSystemConfigCreationPayload = {
  groupKey: 'country',
  itemKey: 'country:ireland',
  value: 'Ireland',
};

const SystemConfigEnglandPayload = {
  groupKey: 'country',
  itemKey: 'country:england',
  locale: 'en',
  value: 'England',
};

const SystemConfigEthiopiaPayload = {
  groupKey: 'country',
  itemKey: 'country:ethiopia',
  locale: 'en',
  value: 'Ethiopia',
};

const SystemConfigSouthAfricaPayload = {
  groupKey: 'country',
  itemKey: 'country:south-africa',
  locale: 'en',
  value: 'South Africa',
};

function compareSystemConfigPayloads(requestPayload, responsePayload) {
  responsePayload.should.have.property('groupKey').eql(requestPayload.groupKey);
  responsePayload.should.have.property('itemKey').eql(requestPayload.itemKey);
  responsePayload.should.have.property('locale').eql(requestPayload.locale);
  responsePayload.should.have.property('value').eql(requestPayload.value);
}

/**
 * Permission checks
 */

it('firebase token is required to access system-config creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/system-config/')
    .send(SystemConfigCreationPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('admin access is required for system-config creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/system-config/')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(SystemConfigCreationPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      done();
    });
});

it('firebase token is required to get system-config by id endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/system-config/configId')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access system-config update endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/system-config/configId')
    .send(SystemConfigCreationPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('admin access system-config update endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/system-config/configId')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(SystemConfigCreationPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      done();
    });
});

it('firebase token is required to get system-config by itemKey and locale', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/system-config/item/itemKey/en')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

/**
 * Functional checks
 */

it('System-config creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/system-config/')
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(SystemConfigCreationPayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      compareSystemConfigPayloads(payload, SystemConfigCreationPayload);
      done();
    });
});

it('Incomplete System-config creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/system-config/')
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(IncompleteSystemConfigCreationPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('Duplicated System-config creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/system-config/')
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(SystemConfigSouthAfricaPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('System-config creation endpoint different locale', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/system-config/')
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(SystemConfigCreationPayloadSwedenInFrench)
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      compareSystemConfigPayloads(payload, SystemConfigCreationPayloadSwedenInFrench);
      done();
    });
});

it('Get system-config by id endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/system-config/60e33a4c97148d29166fe2b1`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      compareSystemConfigPayloads(payload, SystemConfigEnglandPayload);
      done();
    });
});

it('Get system-config by id endpoint not found', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/system-config/${initSpec.getAdmin().id}`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkFailResponse(res, 404);
      done();
    });
});

it('System config update endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/system-config/60e33a4c97148d29166fe2b1`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(SystemConfigUpdatePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      compareSystemConfigPayloads(payload, SystemConfigUpdatedPayload);
      done();
    });
});

it('System config update endpoint id not found', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/system-config/${initSpec.getAdmin().id}`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(SystemConfigUpdatePayload)
    .end((err, res) => {
      base.checkFailResponse(res, 404);
      done();
    });
});

it('Get system-config by item key and locale endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/system-config/item/country:south-africa/en`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      compareSystemConfigPayloads(payload, SystemConfigSouthAfricaPayload);
      done();
    });
});

it('Get list of configs by group key', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/system-config/list/country/en`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      assert.equal(payload.length, 3);
      compareSystemConfigPayloads(payload[0], SystemConfigEnglandPayload);
      compareSystemConfigPayloads(payload[2], SystemConfigSouthAfricaPayload);
      compareSystemConfigPayloads(payload[1], SystemConfigEthiopiaPayload);
      done();
    });
});

it('search system-config endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/system-config/search/country/en?q=e`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      assert.equal(payload.length, 2);
      compareSystemConfigPayloads(payload[0], SystemConfigEnglandPayload);
      compareSystemConfigPayloads(payload[1], SystemConfigEthiopiaPayload);
      done();
    });
});
