const express = require('express');
const router = express.Router();
const {
  createRequest,
  getPendingRequests,
  acceptRequest,
  completeVisit,
} = require('../controllers/inHouseController');

router.route('/')
  .post(createRequest);

router.route('/pending')
  .get(getPendingRequests);

router.route('/:id/accept')
  .patch(acceptRequest);

router.route('/:id/complete')
  .patch(completeVisit);

module.exports = router;