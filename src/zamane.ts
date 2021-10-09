import fs from 'fs';
import JSZip from 'jszip';
import child_process from 'child_process';
import util from 'util';
import hasbin from 'hasbin';
import https from 'https';

const exec = util.promisify(child_process.exec);

export interface ZamaneCredentials {
    tssAddress: string,
    tssPort: string,
    customerNo: string,
    customerPassword: string,
}

class Zamane {
    private credentials: ZamaneCredentials;

    // downloads file with given url
   
    private async downloadFile(url: string): Promise<Buffer> {

        const data = await new Promise<Buffer>((resolve, reject) => {

            https.get(url, (res) => {
                let body = "";
                res.setEncoding("binary");
                res.on("data", data => {
                    body += data;
                });

                res.on("end", () => {
                    resolve(Buffer.from(body, 'binary'));
                });

                res.on("error", reject);
            });
        });

        
        return data;
    }

    constructor(credentials: ZamaneCredentials) {
        this.credentials = credentials;

        if(!this.checkJavaInstalled()) {
            throw new Error('Java must be installed on $PATH');
        }
    }

    private checkJavaInstalled() {
        return hasbin.sync('java');
    }

    private async downloadZamane() {
        const zamaneZIpUrl = 'https://kamusm.bilgem.tubitak.gov.tr/urunler/zaman_damgasi/dosyalar/tss-client-console-3.1.17.zip';

        // Download the zip file

        const zamaneZipFile = await this.downloadFile(zamaneZIpUrl);

        // Unzip the file

        const zamaneZip = await JSZip.loadAsync(zamaneZipFile);
        const zamaneFile = zamaneZip.file('tss-client-console-3.1.17.jar');


        if (!zamaneFile) {
            throw new Error('Zamane file not found');
        }
        // Save the file

        const zamaneFileData = await zamaneFile.async('nodebuffer');
        const zamaneFilePath = this.getZamaneJarLocation();

        fs.writeFileSync(zamaneFilePath, zamaneFileData);
    }

    // check if zamane already exists
    public checkZamaneExists() {
        const zamaneFilePath = this.getZamaneJarLocation();
        return fs.existsSync(zamaneFilePath);
    }


    private async runZamane(args: string[]) {
        const zamaneFilePath = this.getZamaneJarLocation();
        const zamaneFileExists = this.checkZamaneExists();
        if (!zamaneFileExists) {
            throw new Error('Zamane file not found');
        }

        const zamaneCommand = `java -jar ${zamaneFilePath} ${args.join(' ')}`;
        const { stdout, stderr } = await exec(zamaneCommand);
        return { stdout, stderr };
    }

    private getZamaneJarLocation() {
        return this.getTempFilePathOnFilesystem() + '/zamane.jar';
    }

    // get temp file path
    private getTempFilePathOnFilesystem() {
        const tempLocation: string = '/tmp/zamanejs';

        if(!fs.existsSync(tempLocation)) {
            fs.mkdirSync(tempLocation);
        }

        return tempLocation;
    }

    // put contents to temp location as file
    private async putContentsToTempFile(contents: string) {
        const tempLocation: string = this.getTempFilePathOnFilesystem();

        // get random file name
        const randomFileName = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);


        const tempFilePath = `${tempLocation}/${randomFileName}.txt`;

        fs.writeFileSync(tempFilePath, contents);

        return tempFilePath;;
    }


    // get timestamp from zamane
    public async stampContents(contents: string) {
        // check if zamane is installed
        const zamaneInstalled = this.checkZamaneExists();
        if (!zamaneInstalled) {
            await this.downloadZamane();
        }

        // put contents to temp location as file
        const tempFilePath = await this.putContentsToTempFile(contents);

        // get timestamp from zamane
        const stampFile = await this.stampFile(tempFilePath);

        // remove temp file
        fs.unlinkSync(tempFilePath);

        // reac the stamp file
        const stampContents = fs.readFileSync(stampFile).toString();


        // remove stamp file
        fs.unlinkSync(stampFile);

        return stampContents;
    }



    public async stampFile(filePath: string) {
        // check if zamane is installed
        const zamaneInstalled = this.checkZamaneExists();
        if (!zamaneInstalled) {
            await this.downloadZamane();
        }

        // get timestamp from zamane
        const { stdout, stderr } = await this.runZamane(['-Z', filePath, this.credentials.tssAddress, this.credentials.tssPort, this.credentials.customerNo, this.credentials.customerPassword, "SHA256"]);

        return filePath + ".zd";
    }

    public async checkStampOfContents(contents: string, stampContens: string) {
            // check if zamane is installed
        const zamaneInstalled = this.checkZamaneExists();
        if (!zamaneInstalled) {
            await this.downloadZamane();
        }

        // put contents to temp location as file
        const tempFilePath = await this.putContentsToTempFile(contents);

        // put stamp to temp location as file
        const tempStampFilePath = await this.putContentsToTempFile(stampContens);

        const isStampValid = await this.checkStampOfFile(tempFilePath, tempStampFilePath);

        // remove temp file
        fs.unlinkSync(tempFilePath);

        // remove temp file
        fs.unlinkSync(tempStampFilePath);

        return isStampValid;
    }

    public async checkStampOfFile(file: string, stampFile: string | null = null) {
        // check if zamane is installed
        const zamaneInstalled = this.checkZamaneExists();
        if (!zamaneInstalled) {
            await this.downloadZamane();
        }

        if(stampFile === null) {
            stampFile = file + ".zd";
        }

        // check if zamane has enough credit
        const { stdout, stderr } = await this.runZamane(['-C', file, stampFile]);

        if(stdout.includes('Zaman Damgasi gecerli, dosya degismemis.')) {
            return true;
        } else {
            return false;
        }

    }

    public async checkCredit() {
        // check if zamane is installed
        const zamaneInstalled = this.checkZamaneExists();
        if (!zamaneInstalled) {
            await this.downloadZamane();
        }

        // check if zamane has enough credit
        const { stdout, stderr } = await this.runZamane(['-k', this.credentials.tssAddress, this.credentials.tssPort, this.credentials.customerNo, this.credentials.customerPassword]);

        // example output of zamane -k command
        // 
        // Kalan kredi: 249

        const kredi = /Kalan kredi\: (?<kredi>\d+)/.exec(stdout);

        if (!kredi || !kredi.groups) {
            throw new Error('Zamane kredi check failed');
        }

        const krediNumber = parseInt(kredi.groups.kredi);

        return krediNumber;
    }

}



export default Zamane;