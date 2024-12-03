import axios from "axios";

// Create an axios instance
export const axiosInstance = axios.create({});

// The apiConnector function that uses the axiosInstance to make requests
export const apiConnector = (method, url, bodyData, headers, params) => {
    return axiosInstance({
        method: `${method}`,
        url: `${url}`,
        data: bodyData ? bodyData : null,
        headers: headers ? headers : null,
        params: params ? params : null,
    });
};
