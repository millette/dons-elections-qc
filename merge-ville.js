'use strict'

const range = require('lodash.range')
const flatten = require('lodash.flatten')

const r = range(2011, 2019)
// const r = range(2017, 2019)

const all = flatten(
  r.map((z) => require(`./dons/dons-elections-qc-${z}.json`)
    .map((x) => {
      if (x.details && x.details.ville) { x.ville = x.details.ville }
      delete x.details
      delete x.nom
      return x
    })
  )
)

console.log(JSON.stringify(all))

/*
const r = range(2000, 2019)
// const r = range(2017, 2019)

const all = flatten(
  r.map((z) => require(`./dons/dons-elections-qc-${z}.json`)
    .map((x) => {
      delete x.details
      delete x.nom
      return x
    })
  )
)

console.log(JSON.stringify(all))
*/
