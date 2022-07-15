const _enums = Object.freeze({
  state: {
    WAITING: 'WAITING',
    RUNNING: 'RUNNING',
    FAILED: 'FAILED',
    NOT_STARTED: 'NOT_STARTED',
    FINISHED: 'FINISHED',
    SCHEDULED: 'SCHEDULED'
  }
})
/**
 * @typedef TrancheControl
 * @property {number} createdAt when the tranche control was initially created
 * @property {number} updatedAt the last updated date
 * @property {TrancheVersion[]} versions
 * @property {*} meta whatever you want - the tranche status
 * @property {JobDescription} jobDescription the job description
 */


/**
 * @typedef PhaseDescription
 * @property {string} name the phase name
 * @property {string} namespace the namepace of the processor
 * @property {string} method the method of the processor
 * @property {number} maxMs max number of ms this is allowed to run for
 * @property {number} threads number of threads to create
 * 
 */
/**
 * @typedef JobDescription
 * @property {PhaseDescriptions[]} phases the phases in the job
 */

/**
 * @typedef TrancheVersion
 * @property {number} createdAt when the tranche revision was initially created
 * @property {number} version version number
 * @property {string} key the key for this version
 * @property {string} state the state of this
 * @property {string} phaseName the phase 
 * @property {number} thread the thread number starting at 0
 * @property {number} scheduledAt when it's next scheduled to run
 * @property {*} error if there's been an error
 */

/**
 * @typeDef TranchePack
 * @property {TrancheVersion} the version this data belongs to
 * @property {*} data the data
 */
class _Tranche {
  constructor({
    jobDescription,
    cacher,
    control,
    userKeys = []
  }) {

    const now = new Date().getTime()
    this.cacher = cacher
    this._userKeys = Utils.arrify(userKeys)
    this._control = control || {
      createdAt: now,
      updatedAt: now,
      versions: [],
      meta: {}
    }
    // override default job description
    if (jobDescription) this._control.jobDescription = jobDescription
  }

  /**
   * get a new instance
   */
  ref({
    jobDescription,
    cacher = this.cacher,
    userKeys = this.userKeys,
    control
  } = {}) {
    return new _Tranche({
      cacher,
      userKeys,
      control,
      jobDescription
    })
  }

  /**
   * find a tranchecontrol by a user supplied key
   * @return self
   */
  find() {
    this.control = this.cacher.get(this.userKey) || this.control
    return this
  }

  /**
   * check if we've started yet
   */
  get isNotStarted() {
    return !this.control.versions.length ||
      this.control.versions.every(f => f.state === this._enums.state.NOT_STARTED)
  }

  // it's finished when every version is finished or there's an error
  get isFinished() {
    return this.isError || this.control.versions.every(f => f.state === this._enums.state.FINISHED)
  }

  get isError () {
    return Boolean(this.getErrorVersions.length)
  }

  get errorVersions () {
    return this.control.versions.filter(f=>f.state=== this._enums.state.ERROR)
  }

  getPhaseByName (phase) {
    return this.control.versions.filter(f=>f.phaseName === phase.name)
  }

  isFinishedForPhase (phase) {
    return this.getPhaseByName(phase).every (f.state === this._enums.state.FINISHED)
  }

  /**
   * get the phase we're supposed to be running
   */
  getPhase() {
    const { versions } = this.control
    const { phases } = this.control.jobDescription
    // set nextPhase
    if (this.isNotStarted) return {
      nextPhase: phases[0]
    }
    // get latest phase
    const phaseIndex = Math.max(...versions.map(v=>phases.findIndex(f=>f.name, v.phaseName)))
    const phase = phaseIndex === -1 ? null : phases[phaseIndex]
    const nextPhase = this.isFinishedForPhase() ? phase[phaseIndex + 1] : null
    const prevPhase = phaseIndex > 0 ? phases[phaseIndex -1] : 0
    return {
      phase,
      nextPhase,
      prevPhase,
      phaseIndex
    }
  }
  /**
   * register a control
   */
  register() {
    this.cacher.set(this.userKey, this.control)
  }

  get userKey() {
    if (!this.userKeys || !this.userKeys.length) throw 'you must supply user key(s) to be able to find this control'
    return this.cacher.keyer(...this.userKeys)
  }

  get userKeys() {
    return this._userKeys
  }

  set userKeys(keys) {
    this._userKeys = Utils.arrify(keys)
  }
  /**
   * set data
   * @param {object} params
   * @param {*} params.data the data to set
   * @return {TranchePack} what was written 
   */
  set({ data, status = this.status }) {

    // always make a new version
    const version = this.addVersion({ status }).currentVersion
    const tranchePack = {
      data,
      version
    }
    this.cacher.set(version.key, tranchePack)
    return tranchePack
  }

  /** 
   * get data for all versions
   * @return {TranchePack[]}
   */
  getAll() {
    return ((this.control && this.control.versions) || []).map(version => this.get({ version }))
  }
  /**
   * get data
   * @param {object} params
   * @param {TrancheVersion} [params.version] currentVersion is the default
   * @return {data}
   */
  get({
    version = this.currentVersion
  } = {}) {
    return version ? this.cacher.get(version.key) : null
  }
  /**
   * get current tranche version
   * @return {TrancheVersion}
   */
  get currentVersion() {
    return this.control ? this.control.versions.slice(-1)[0] : null
  }
  /**
   * makes a new version and adds to control
   * @return {tranche} self
   */
  addVersion({ status = this.status } = {}) {
    const now = new Date().getTime()

    // a new version
    const version = {
      createdAt: now,
      key: Utilities.getUuid(),
      version: this.control.versions.length,
      status
    }

    // a new control
    this.control = {
      ...this.control,
      status,
      version: trancheControl.version + 1,
      updatedAt: now,
      versions: [...trancheControl.versions, version]
    }

    // also register
    this.register()
    return this
  }

  reset() {
    this.control = null
    this.register()
  }

  set status(status) {
    this.control.status = status
    // just updates the current status without creating a new version
    this.register()
  }

  get status() {
    const status = this.control && this.control.status
    return Utils.isNU(status) ? {} : status
  }

  set control(control) {
    this._control = control
  }
  get control() {
    return this._control
  }

}
var Tranche = _Tranche