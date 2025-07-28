// Polyfill for Response and Request objects in Node.js test environment
import { TextEncoder, TextDecoder } from 'util'

// Polyfill fetch for Node.js
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Response and Request for MSW compatibility
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Map(Object.entries(init.headers || {}))
    this.ok = this.status >= 200 && this.status < 300
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
  }

  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body))
  }
}

global.Request = class Request {
  constructor(url, init = {}) {
    this.url = url
    this.method = init.method || 'GET'
    this.headers = new Map(Object.entries(init.headers || {}))
    this.body = init.body
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
  }
}

// Mock Headers
global.Headers = class Headers extends Map {
  constructor(init) {
    super()
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value))
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value))
      }
    }
  }

  append(name, value) {
    const existing = this.get(name)
    this.set(name, existing ? `${existing}, ${value}` : value)
  }
}

// Mock BroadcastChannel for MSW
global.BroadcastChannel = class BroadcastChannel {
  constructor(name) {
    this.name = name
  }
  
  postMessage() {}
  close() {}
  addEventListener() {}
  removeEventListener() {}
}

// Mock TransformStream
global.TransformStream = class TransformStream {
  constructor() {
    this.readable = {}
    this.writable = {}
  }
}

// Mock ReadableStream
global.ReadableStream = class ReadableStream {
  constructor() {}
}

// Mock WritableStream
global.WritableStream = class WritableStream {
  constructor() {}
}