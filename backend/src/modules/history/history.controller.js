const History = require('../../database/models/History');

const getHistory = async (req, res, next) => {
  try {
    const history = await History.find().sort({ playedAt: -1 });
    res.json(history);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistory
};
