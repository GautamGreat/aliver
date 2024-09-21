
class webSerial {
  constructor (filter) {
    this.usb_device = null
    this.filter = filter
    this.last_error = ""
  }

  async requestDevice () {
    if (window.navigator.serial === undefined) {
      this.last_error = "Unsupported browser / os"
      return false
    }

    try {
      this.usb_device = await navigator.serial.requestPort(this.filter)
      return true
    } catch (e) {
      this.last_error = e.message;
    }
    return false
  }

  async connect () {
    try {
      await this.usb_device.open({
        baudRate: 115200,
        parity: "none",
        dataBits: 8,
        stopBits: 1
      })
      return true
    } catch (e) {
      this.last_error = e.message
    }
    return false
  }

  async write (buffer) {
    let data_writer = this.usb_device.writable.getWriter()
    try {
      return await data_writer.write(buffer)
    } finally {
      data_writer.releaseLock()
    }
  }

  async read (length) {
    let data_reader = this.usb_device.readable.getReader()
    try {
      let buffer = new ArrayBuffer(length)
      return await data_reader.read(new Uint8Array(buffer, 0, length))
    } finally {
      data_reader.releaseLock()
    }
  }

  async disconnect () {
    await this.usb_device.close()
  }

}

export default webSerial