class MyError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.message = message;
    this.status = status;
    this.name = "MyError";
  }
}

module.exports = MyError;
