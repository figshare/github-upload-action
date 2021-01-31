class FigshareAPIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FigshareAPIError';
  }
}

module.exports = FigshareAPIError;
