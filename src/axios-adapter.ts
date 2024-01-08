import axios from "axios";
import HttpClient from "./http-client";

export default class AxiosAdapter implements HttpClient {
	constructor () {
		axios.defaults.validateStatus = function () {
			return true;
		}
	}

	async get(url: string): Promise<any> {
		const response = await axios.get(url);
		return response.data;
	}
}