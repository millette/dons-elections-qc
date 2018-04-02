'use strict'

/*
 * FIXME
 * dons-elections-qc-2011.json
 *   "parti": "C.A.Q. <a class=\"speccur\" id=\"lienCAQ14\">[?]</a>",
*/

// core
const fs = require('fs')

// npm
const pMap = require('p-map')
const delay = require('delay')
const range = require('lodash.range')

// self
// const { readYear, range } = require('.')
const { readYear } = require('.')

// const r = range(2019 - 2000, 2000)
const r = range(2000, 2019)

const doYear = (year) => {
  const now = Date.now()
  console.log(year)
  return delay(15000, year)
    .then(readYear)
    .then((xs) => {
      fs.writeFileSync(`dons/dons-elections-qc-${year}.json`, JSON.stringify(xs))
      console.log(year, xs.length, 'items', Date.now() - now - 15000, Math.round(1000 * xs.length / (Date.now() - now - 15000)) / 1000, 'ms per item')
    })
}

pMap(r, doYear, { concurrency: 1 })
  .then(() => console.log('All done!'))
  .catch(console.error)
