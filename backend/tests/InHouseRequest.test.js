const mongoose = require('mongoose');
const InHouseRequest = require('../models/InHouseRequest');

describe('InHouseRequest Model Test', () => {
  // Ensure connection closes properly after tests to prevent hanging handles
  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  // Test 1: Fail when required fields are missing
  it('should fail to save if required fields are missing', async () => {
    const requestWithoutRequiredField = new InHouseRequest({});

    let err;
    try {
      await requestWithoutRequiredField.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.citizen).toBeDefined();
    expect(err.errors.address).toBeDefined();
    expect(err.errors.preferredDate).toBeDefined();
    expect(err.errors.vaccineOrReason).toBeDefined();
  });

  // Test 2: Fail when an invalid status is provided
  it('should fail if an invalid status enum value is passed', async () => {
    const invalidRequest = new InHouseRequest({
      citizen: new mongoose.Types.ObjectId(),
      address: '456 Sample Ave',
      preferredDate: new Date(),
      vaccineOrReason: 'General Checkup',
      status: 'InvalidStatusType',
    });

    let err;
    try {
      await invalidRequest.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.status).toBeDefined();
  });
});