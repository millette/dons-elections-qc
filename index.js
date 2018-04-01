'use strict'

// core
const urlImp = require('url')
const parseUrl = urlImp.parse
const URL = urlImp.URL

// npm
const got = require('got')
const cheerio = require('cheerio')
const pMap = require('p-map')
const iconv = require('iconv-lite')

const concurrency = 10
const baseForm = 'ckparti=on&ckdia=on&ckcia=on&ckent=on&control_2[]=00049&control_2[]=00075&control_2[]=9994&control_2[]=00059&control_2[]=00094&control_2[]=00084&control_2[]=00085&control_2[]=00079&control_2[]=00087&control_2[]=00091&control_2[]=00077&control_2[]=00092&control_2[]=00081&control_2[]=00083&control_2[]=00070&control_2[]=9998&control_2[]=00088&control_2[]=99910&control_2[]=99911&control_2[]=99913&control_2[]=99999&control_2[]=99912&control_2[]=00052&control_2[]=00086&control_2[]=00073&control_2[]=99916&control_2[]=00010&control_2[]=00103&control_2[]=00034&control_2[]=00080&control_2[]=00016&control_2[]=99921&control_2[]=00093&control_2[]=99922&control_2[]=00063&control_2[]=00061&control_2[]=00102&control_2[]=00082&control_2[]=00104&control_2[]=00039&control_2[]=00065&control_2[]=99926&control_2[]=00089&control_2[]=00090&control_2[]=99927&control_2[]=99928&control_2[]=99929&control_3[]=00096&control_3[]=00099&control_3[]=00100&control_3[]=00097&control_3[]=00098&control_3[]=00095&control_3[]=00101&control_4[]=12030&control_4[]=14002&control_4[]=12006&control_4[]=1009&control_4[]=12008&control_4[]=12020&control_4[]=17002&control_4[]=12014&control_4[]=12001&control_4[]=14003&control_4[]=12011&control_4[]=12024&control_4[]=14001&control_4[]=12043&control_4[]=14008&control_4[]=12004&control_4[]=14009&control_4[]=12005&control_4[]=11001&control_4[]=12009&control_4[]=14004&control_4[]=1008&control_4[]=15001&control_4[]=14005&control_4[]=14006&control_4[]=17001&control_4[]=14007&control_4[]=17003&control_5[]=17&control_5[]=14&control_5[]=11&control_5[]=10&control_5[]=8&control_5[]=1&control_5[]=2&control_5[]=3&control_6[]=5&control_6[]=12&control_6[]=33&control_6[]=27&control_6[]=25&control_6[]=6&control_6[]=7&control_6[]=4&control_6[]=21&control_6[]=34&control_6[]=28&control_6[]=14&control_6[]=13&control_6[]=24&control_6[]=36&control_6[]=22&control_6[]=15&control_6[]=37&control_6[]=1&control_6[]=26&control_6[]=29&control_6[]=2&control_6[]=20&control_6[]=44&control_6[]=3&control_6[]=45&control_6[]=23&control_6[]=32&nom=&somme_minimum=&somme_maximum=&action=resultat&liste_tri=NOM_PRENOM_DONATEUR&control_1[]='
const baseUrl = 'https://www.electionsquebec.qc.ca/francais/provincial/financement-et-depenses-electorales/recherche-sur-les-donateurs.php?page='
const encoding = null
const headers = { 'content-type': 'application/x-www-form-urlencoded' }

const parseDetails = (el) => {
  const href = el.attr('href')
  const ret0 = parseUrl(href, true)
  if (!ret0) { return }
  const ret = ret0.query
  if (!ret) { return }
  if (ret.v) {
    ret.ville = ret.v
    delete ret.v
  }
  if (ret.cp) {
    ret.codepostal = ret.cp
    delete ret.cp
  }
  ret.url = new URL(href, 'https://www.electionsquebec.qc.ca')
  return ret
}

const range = (n, start, step) => {
  if (!step) { step = 1 }
  if (!start) { start = 0 }
  const a = new Array(n)
  let r = -1
  while (++r < n) { a[r] = step * r + start }
  return a
}

const nextPage = ($) => {
  const x1 = $('table.tableau')
    .next('table')
    .children('tbody')
    .children('tr')
    .children('td')

  const f = $(x1.get(2)).children('a').attr('href')
  const next = f && parseInt(f.split('=')[1], 10)
  const f2 = $(x1.get(3)).children('a').attr('href')
  const last = f2 && parseInt(f2.split('=')[1], 10)
  return { next, last }
}

const parse = (res) => {
  const $ = cheerio.load(iconv.decode(res.body, 'win1252'), { decodeEntities: false })
  const xs = []
  $('table.tableau tbody tr').slice(1, -1).each(function () {
    let nom
    let details
    let montant
    let versements
    let parti
    let annee

    const x = $('td', this).map((i, el) => {
      const $el = $(el)
      switch (i) {
        case 0:
          const a = $('a', $el)
          if (a.html()) {
            nom = a.html().trim()
            details = parseDetails(a)
          } else {
            nom = $(x[0]).html().trim()
          }
          break

        case 1:
          montant = parseFloat($el.text().trim().replace(/( |&nbsp;|\xa0)/g, '').replace(',', '.'))
          break

        case 2:
          versements = parseInt($el.text(), 10) || undefined
          break

        case 3:
          parti = $el.html().trim().replace(/<br>/g, '\n')
          break

        case 4:
          annee = parseInt($el.text(), 10)
          break
      }
    })
    xs.push({ nom, details, montant, versements, parti, annee })
  })
  if (xs.length) { return { xs, ...nextPage($) } }
}

const read = (year, pageNumber) => got(baseUrl + (pageNumber || 1), { body: baseForm + (year || 2018), encoding, headers })
  .then(parse)

const readYear = (year) => read(year).then(
  ({ xs, next, last }) => (!next || (last <= 1)) ? xs : pMap(range(last - 1, 2), read.bind(null, year), { concurrency })
    .then(result => result.map((a) => a.xs).reduce((acc, val) => acc.concat(val), xs))
)

module.exports = { readYear, range, read }
