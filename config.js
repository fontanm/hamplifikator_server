/* var appsettings = {
    consumerkey: 'IXIGOJRhenPYxGXLVi9IyaYcn',
    consumersecret: '1ulPgmRhNgaL0DIw5ZkJBNJlaXreGg55rsucezqmpd1vRidHwc',
    bearertoken: ''
}; */

module.exports = function(){
    switch(process.env.NODE_ENV){
        case 'development':
            return {
        		appsettings: {
    				consumerkey: 'IXIGOJRhenPYxGXLVi9IyaYcn',
    				consumersecret: '1ulPgmRhNgaL0DIw5ZkJBNJlaXreGg55rsucezqmpd1vRidHwc',
					bearertoken: ''
				},
        		db: 'mongodb://localhost:27017/twitter-store'
            };

        case 'production':
            return {
            	appsettings: {
    				consumerkey: 'IXIGOJRhenPYxGXLVi9IyaYcn',
    				consumersecret: '1ulPgmRhNgaL0DIw5ZkJBNJlaXreGg55rsucezqmpd1vRidHwc',
					bearertoken: ''
				},
            	db: 'mongodb://hampl:aFPCcV2I3AzpTEz50q49@ds229312.mlab.com:29312/hamplifikator'
            };

        default:
            return {

            };
    }
};
