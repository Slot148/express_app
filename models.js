const fs = require('fs')
const path = require('path')

class JSON_MANAGER{

    constructor(completeFilePath){
        const {fileName, filePath} = getFileInfo(completeFilePath)
        this.filePath = filePath
        this.fileName = fileName
        this.lockFile = path.join(filePath, `.${filename}.lock`)
        this.init()
    }

    getFileInfo(dir) {
    const parsed = path.parse(dir)
    return {
        fileName: parsed.base,
        filePath: parsed.dir + path.sep
    }
}

    async init(){
        try{
            if(!fs.existsSync(this.filePath)){
                await fs.promises.mkdir(this.filePath, {recursive: true})
            }
            if(!fs.existsSync(path.join(this.filePath, this.fileName))){
                await fs.promises.writeFile(path.join(this.filePath, this.fileName), JSON.stringify([], null, 2))
            }
            if(fs.existsSync(this.lockFile)){
               fs.unlinkSync(this.lockFile)
            }

        }catch(error){
            console.log('Error in JSON_MANAGER Inicialization:' , error)
        }
        
    }

    async acquireLock(){
        const maxAttempts = 10
        const retryDelay = 100

        for(let attempt = 0; attempt < maxAttempts; attempt++){
            try{
                const fd = fs.openSync(this.lockFile, 'wx')
                fs.closeSync(fd)
                return true
            }catch(error){
                if(error.code === 'EEXIST'){
                    await new Promise(resolve => setTimeout(resolve, retryDelay))
                    continue
                }
                throw error
            }
        }
        throw new Error(`Could not acquire lock after maximum attempts`)
    }

    async releaseLock(){
        try {
            if(fs.existsSync(this.lockFile)){
               fs.unlinkSync(this.lockFile)
            }
        } catch (error) {
            console.error('Error releasing lock: ', error)
        }
    }

    async beginTransaction(){
        await this.acquireLock()
        const backupPath = path.join(this.filePath, `.${this.fileName}.backup`)
        const currentData = await this.readDB()
        await fs.promises.writeFile(backupPath, JSON.stringify(currentData))
        return{
            commit: async () => {
                try{
                    await this.releaseLock()
                    fs.unlinkSync(backupPath)
                }catch(error){
                    console.error('Erro ao enviar transações', error);
                    throw error
                }
            },
            rollback: async () => {
                try {
                    const backupData = JSON.parse(await fs.promises.readFile(backupPath, 'utf-8'))
                    await this.writeDB()
                    await this.releaseLock()
                    fs.unlinkSync(backupPath)
                } catch (error) {
                    console.error('Error rolling back transaction: ', error)
                    throw error
                }
            }

        }
    }

    async withLock(fn) {
    await this.acquireLock();
    try {
        const result = await fn();
        await this.releaseLock();
        return result;
    } catch (error) {
        await this.releaseLock();
        throw error;
    }
}

    async getNextID(){
        let maior = 0
        const rawData = await this.readDB()
        const newID = rawData.forEach(item => {
            if(item.id > maior) maior = item.id
        });
        return maior+1
    }

    async writeDB(data){
        await this.withLock(async () => {
            try {
            await fs.promises.writeFile(path.join(this.filePath, this.fileName), JSON.stringify(data, null, 2))
            console.log('Os seguintes dados foram sobrescritos no Banco: ', data)
            return true
            } catch (error) {
                console.error('Falha ao escrever dados: ', error)
                return false
            }
        })
    }

    async readDB(){
        await this.withLock(async () => {
            try {
                console.log('Os dados foram obtidos do Banco')
                return JSON.parse(await fs.promises.readFile(path.join(this.filePath, this.fileName), 'utf-8'))
            } catch (error) {
                console.error('Não foi possível obter dados do banco: ', error)
                return false
            }
        })
    }
    
    async addDB(data){
        await this.withLock(async () => {
            try {
                const rawData = await this.readDB()
                rawData.push(data)
                await this.writeDB(rawData)
                console.log('Novo item adicionado ao banco: ', data)
                return true
            } catch (error) {
                console.error('Não foi possivel adicionar novo item ao banco: ', error)
                return false
            }    
        })
        
    }

    async selectDB(identifier, value){
        await this.withLock(async () => {
            try {
                const rawData = await this.readDB()
                if(typeof value === 'function'){
                    const selectedData = rawData.filter(value)
                    return selectedData 
                }else{
                    const selectedData = rawData.filter(item => item[identifier] === value)
                    return selectedData 
                }
            } catch (error) {
                console.error('Erro ao selecionar dados:', error);
                return false
            }    
        })
        
    }
    
    async findDB(identifier, identifier_key = 'id'){
        await this.withLock(async () => {
            try {
                const rawData = await this.readDB()
                let filteredData = rawData.find(item => item[identifier_key] === identifier)
                console.log('Resultados encontrados no banco: ', filteredData)
                return filteredData    
            } catch (error) {
                console.error('Resultados não encontrados no banco: ', error)
                return false
            }
        })
    }
    
    async editDB(data, identifier, identifier_key = 'id'){
        await this.withLock(async () => {
            try {
                const rawData = await this.readDB()
                const newData = rawData.map(item => item[identifier_key] === identifier ? {...item, ...data} : item)
                await this.writeDB(newData)
                return true
            } catch (error) {
                console.error('Erro ao alterar dados:', error);
                return false
            }    
        })
        
    }
    
    async deleteDB(identifier, identifier_key = 'id'){
        await this.withLock(async () => {
            try {
                const rawData = await this.readDB()
                const newData = rawData.filter(item => item[identifier_key] != identifier)
                await this.writeDB(newData)
                return true
            } catch (error) {
                console.error('Erro ao alterar dados:', error);
                return false            
            }            
        })

    }
}

module.exports = JSON_MANAGER