const { readDb, FILES } = require('../../database');

const getHistory = (req, res, next) => {
  try {
    const history = readDb(FILES.HISTORY_FILE);
    res.json(history);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistory
};
