const persistMock = {
  get: jest.fn(),
  getStorageInfo: jest.fn(),
  queue: jest.fn(),
  set: jest.fn()
}

export default persistMock
