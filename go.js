'use strict'

// core
const fs = require('fs')

// npm
const pMap = require('p-map')
const delay = require('delay')

// self
const { readYear, range } = require('.')

const r = range(2019 - 2000, 2000)

const doYear = (year) => {
  const now = Date.now()
  console.log(year)
  return delay(15000, year)
    .then(readYear)
    .then((xs) => {
      fs.writeFileSync(`dons/dons-elections-qc-${year}.json`, JSON.stringify(xs))
      console.log(year, xs.length, Date.now() - now - 15000)
    })
}

pMap(r, doYear, { concurrency: 1 })
  .then(() => console.log('All done!'))
  .catch(console.error)
