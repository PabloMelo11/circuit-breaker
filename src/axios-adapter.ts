import axios from "axios";
import HttpClient from "./http-client";

export default class AxiosAdapter implements HttpClient {
	constructor () {
		axios.defaults.validateStatus = function () {
			return true;
		}
	}

	async get(url: string): Promise<any> {
		try {
			const response = await axios.get(url);
			return response.data;
		} catch (err) {
			return err;
		}
	}
}