"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("./server/api"));
// Load environment variables
dotenv_1.default.config();
// Start the server
const port = process.env.PORT || 3001;
api_1.default.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
