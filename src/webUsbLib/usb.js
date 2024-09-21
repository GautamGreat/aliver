import webSerial from "./webSerial"
import webUsb from "./webUsb"

class Usb {
  constructor (filter) {
    this.usb_worker = null
    if(navigator.userAgent.includes("Windows")) {
      this.usb_worker = new webSerial({usbVendorId: filter.vendorId, usbProductId: filter.productId})
    } else {
      this.usb_worker = new webUsb({vendorId: filter.vendorId, productId: filter.productId})
    }
  }

  async requestDevice () {
    return await this.usb_worker.requestDevice()
  }

  get last_error () {
    return this.usb_worker.last_error
  }

  async connect () {
    return await this.usb_worker.connect()
  }

  async write (buffer) {
    return await this.usb_worker.write(buffer)
  }

  async read (length) {
    return await this.usb_worker.read(length)
  }

  async disconnect () {
    this.usb_worker.disconnect()
  }

}

export default Usb