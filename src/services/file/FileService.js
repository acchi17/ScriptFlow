/**
 * FileService - File operations service
 */
export default class FileService {
  /**
   * Constructor
   */
  constructor() {
  }

  /**
   * Read XML file and parse it
   * @param {string} filePath File path to XML file
   * @return {Promise<Document>} Parsed XML document
   * @throws {Error} File read or parse error
   */
  async readXmlFile(filePath) {
    if (!filePath) {
      throw new Error("File path must be specified");
    }
    
    try {
      const content = await this._readFile(filePath);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, "text/xml");
      
      // Check for XML parse error
      if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        throw new Error("XML parse error: " + xmlDoc.body.textContent);
      }
      
      return xmlDoc;
    } catch (error) {
      console.error(`[XML Read Error] ${filePath}:`, error.message);
      throw new Error(`Failed to read XML file: ${filePath}`);
    }
  }

  /**
   * Read JSON file and parse it
   * @param {string} filePath File path to JSON file
   * @return {Promise<Object>} Parsed JSON object
   * @throws {Error} File read or parse error
   */
  async readJsonFile(filePath) {
    if (!filePath) {
      throw new Error("File path must be specified");
    }
    
    try {
      const content = await this._readFile(filePath);
      const jsonData = JSON.parse(content);
      return jsonData;
    } catch (error) {
      console.error(`[JSON Read Error] ${filePath}:`, error.message);
      throw new Error(`Failed to read JSON file: ${filePath}`);
    }
  }

  /**
   * Common file read method (private)
   * @private
   * @param {string} filePath File path
   * @return {Promise<string>} File content
   * @throws {Error} File read error
   */
  async _readFile(filePath) {
    try {
      // Read file using Fetch API
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: File not found - ${filePath}`);
      }

      const content = await response.text();
      return content;
    } catch (error) {
      console.error(`[File Read Error] ${filePath}:`, error.message);
      throw new Error(`Failed to read file: ${filePath}`);
    }
  }

}
