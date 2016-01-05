import assert = require('assert');
import mocha = require('mocha');

describe("Test discovery", () => {

    before(function (done) {
        this.timeout(10000);

        done();
    });

    /**
     * This test was used to debug an issue with Visual Studio / NTVS 
     * test discovery. The test discovery showed a pretty cryptic error message:
     *
     * Test discovery error: [TypeError: Cannot read property 'replace' of undefined] in P:\BuyCo\BuyCo\test\controllers\testProposalController.js
     *
     * The test below does roughly what the NTVS test discovery does, but
     * /within/ a Mocha test. Running this test from the command line 
     * showed a complete stack trace of the error, which showed the cause,
     * which now has been fixed: in serviceFactory the configuration 
     * couldn't be found when running from within the VS test runner.
     */
    it("should discover tests", function (done) {
        this.timeout(1000000);
        var m = new mocha();
        m.addFile("testProposalController.js");
        var mAny = <any>m;
        
        // This line would trigger the error described above.
        mAny.loadFiles();
        console.log(mAny.suite);
        var t = mAny.suite.suites[0].tests[0];
        console.log(t.fullTitle());

        console.log(mAny.suite.suites[0].fullTitle());

        done();
    });
});
