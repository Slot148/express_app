const path = require('path')
const express = require('express')
const JSON_MANAGER = require("./models")
const root = (folder) => path.join(__dirname, folder)
const app = express()

const PRODUCTS_BD_PATH = new JSON_MANAGER(root('data/productsDB.json'))

async function requireProductsForm(req){
    const data = {...req.body}
    data.id = await PRODUCTS_BD_PATH.getNextID()
    const image = req.files?.image
    image.mv(root('public/images/' + image.name))
    data.imagePath = '/images/' + image.name
    await PRODUCTS_BD_PATH.addDB(data)
}

module.exports = {requireProductsForm, PRODUCTS_BD_PATH}