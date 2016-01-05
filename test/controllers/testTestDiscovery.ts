import assert = require('assert');
import mocha = require('mocha');

describe("Test discovery", () => {

    before(function (done) {
        this.timeout(10000);

        done();
    });

    it("should discover tests", function (done) {
        this.timeout(1000000);
        var m = new mocha();
        m.addFile("testProposalController.js");
        var mAny = <any>m;
        mAny.loadFiles();
        console.log(mAny.suite);
        var t = mAny.suite.suites[0].tests[0];
        console.log(t.fullTitle());

        console.log(mAny.suite.suites[0].fullTitle());

        done();
    });
});
