/**
 * @typedef SplinterControl
 * @property {number} createdAt when the splinter control was initially created
 * @property {number} updatedAt the last updated date
 * @property {number} version the latest version number
 * @property {SplinterVersion[]} versions
 */

/**
 * @typedef SplinterVersion
 * @property {number} createdAt when the splinter revision was initially created
 * @property {number} version version number
 * @property {string} key the key for this version
 */

/**
 * @typeDef SplinterPack
 * @property {SplinterVersion} the version this data belongs to
 * @property {*} data the data
 */
class Splinter {
  constructor({
    cacher,
    control,
    userKeys = []
  }) {
    this.cacher = cacher
    this._control = control || null
    this._userKeys = Utils.arrify(userKeys)
  }

  /**
   * get a new instance
   */
  ref({
    cacher = this.cacher,
    userKeys = this.userKeys,
    control
  }={}) {
    return new Splinter({
      cacher,
      userKeys,
      control
    })
  }

  /**
   * find a splintercontrol by a user supplied key
   * @return self
   */
  find() {
    this.control =  this.cacher.get(this.userKey)
    return this
  }

  /**
   * register a control
   */
  register() {
    this.cacher.set(this.userKey, this.control)
  }

  get userKey () {
    if (!this.userKeys || !this.userKeys.length) throw 'you must supply user key(s) to be able to find this control'
    return this.cacher.keyer(...this.userKeys)
  }

  get userKeys() {
    return this._userKeys
  }

  set userKeys (keys) {
    this._userKeys = Utils.arrify(keys)
  }
  /**
   * set data
   * @param {object} params
   * @param {*} params.data the data to set
   * @return {SplinterPack} what was written 
   */
  set({ data }) {

    // always make a new version
    const version = this.addVersion().currentVersion
    const splinterPack = {
      data,
      version
    }
    this.cacher.set(version.key, splinterPack)
    return splinterPack
  }

  /** 
   * get data for all versions
   * @return {SplinterPack[]}
   */
  getAll () {
    return ((this.control && this.control.versions) || []).map(version=>this.get({version}))
  }
  /**
   * get data
   * @param {object} params
   * @param {SplinterVersion} [params.version] currentVersion is the default
   * @return {data}
   */
  get({
    version = this.currentVersion
  } = {}) {
    return version ? this.cacher.get(version.key) : null
  }
  /**
   * get current splinter version
   * @return {SplinterVersion}
   */
  get currentVersion() {
    return this.control ? this.control.versions.slice(-1)[0] : null
  }
  /**
   * makes a new version and adds to control
   * @return {Splinter} self
   */
  addVersion() {
    const now = new Date().getTime()

    // first time in there won't be one
    const splinterControl = this.control || {
      createdAt: now,
      version: -1,
      versions: []
    }

    // a new version
    const version = {
      createdAt: now,
      key: Utilities.getUuid(),
      version: splinterControl.versions.length
    }

    // a new control
    this.control = {
      ...splinterControl,
      version: splinterControl.version + 1,
      updatedAt: now,
      versions: [...splinterControl.versions, version]
    }

    // also register
    this.register ()
    return this
  }

  reset () {
    this.control = null
    this.register()
  }

  set control(control) {
    this._control = control
  }
  get control() {
    return this._control
  }

}