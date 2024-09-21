

class webUsb {
  constructor(filter) {
    this.usb_device = null
    this.filter = [filter]
    this.ep_in = null
    this.ep_out = null
    this.last_error = ""
  }

  async requestDevice () {
    if(window.navigator.usb === undefined) {
      this.last_error = "Unsupported browser / os"
      return false
    }

    try {
      this.usb_device = await window.navigator.usb.requestDevice({filters: this.filter})
      return true
    } catch (e) {
      this.last_error = e.message
    }

    return false
  }

  async claimInterface () {
    const find_device = () => {
      for (let i in this.usb_device.configurations) {
        let config = this.usb_device.configurations[i]
        for (let j in config.interfaces) {
          let interfaces = config.interfaces[j]
          for (let k in interfaces.alternates) {
            let alternates = interfaces.alternates[k]
            if(alternates.interfaceClass === 255) {
              return {config: config, interface: interfaces, alternates: alternates}
            }
          }
        }
      }
      return null
    }

    const get_ep_number = (endpoints, dir, type="bulk") => {
      let e, ep
      for (e in endpoints) {
        ep = endpoints[e]
        if (ep.direction === dir && ep.type === type) return ep.endpointNumber
      }
      throw new Error("Cannot find " + dir + " endpoint")
    }

    let match = find_device()
    if (match === null) {
      this.last_error = "Endpoint match not found"
      return false
    }

    await this.usb_device.selectConfiguration(match.config.configurationValue)
    await this.usb_device.claimInterface(match.interface.interfaceNumber)

    this.ep_in = get_ep_number(match.alternates.endpoints, "in")
    this.ep_out = get_ep_number(match.alternates.endpoints, "out")
    return true
  }

  async connect () {
    try {
      await this.usb_device.open()
      return await this.claimInterface()
    } catch (e) {
      this.last_error = e.message;
    }
    return false
  }

  async write (buffer) {
    return await this.usb_device.transferOut(this.ep_out, buffer)
  }

  async read (length) {
    let buffer = await this.usb_device.transferIn(this.ep_in, length)
    return {value: buffer.data.buffer}
  }

  async disconnect () {
    await this.usb_device.close()
  }

}

export default webUsb