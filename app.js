const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const fileUpload = require('express-fileupload')
const path = require('path')
const fs = require('fs')
const app = express()
const JSON_MANAGER = require('./models')
const {requireProductsForm, PRODUCTS_BD_PATH} = require('./functions')

const root = (folder) => path.join(__dirname, folder)

app.use(expressLayouts)
app.set('view engine', 'ejs')
app.set('views', root('views'))

app.use(fileUpload())
app.use(express.static(root('public')))
app.use(express.static(root('data')))
app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.get('/', (req, res) => {
    res.render('pages/novo_produto', {title: 'Criar Produtos'})
})

app.post('/', async (req, res) => { 
    await requireProductsForm(req)
    res.redirect('/')
})

app.get('/ver_produtos', async (req, res) => {
    const data = await PRODUCTS_BD_PATH.readDB()
    res.render('pages/ver_produtos', {title: 'Ver Produtos', produtos: data})
})

app.get('/del_bd', async (req, res) => {
    await PRODUCTS_BD_PATH.writeDB([])
    res.redirect('/')
})

app.get('/del_item/:id', async (req, res) => {
    const {id} = req.params
    await PRODUCTS_BD_PATH.deleteDB(id, 'id')
    res.redirect('/ver_produtos')
})

app.get('/find/:id', async (req, res) => {
    let {id} = req.params
    id = String(id)
    const data = await PRODUCTS_BD_PATH.findDB(id)
    res.send(data)
})


const PORT = 3000
app.listen(PORT, () => console.log(`servidor rodando em: http://localhost:${PORT}`))