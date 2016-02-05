import assert = require('assert');
import proposalModel = require('../models/proposalModel');
import proposalService = require('./proposalService');
import Q = require('q');

describe("ProposalService", () => {
    var service;

    before((done) => {
        service = new proposalService.ProposalService();
        done();
    });

    it("should be able to get all proposals", (done) => {
        service.getAll().then((proposals) => {
            assert.equal(proposals.length, 8);
            done();
        });
    });


    
    // getOne(proposalId: string): Q.Promise<proposalModel.IProposal> {
    // getBackers(proposalId): Q.Promise<Array<proposalBackingModel.IProposalBacking>> {
    // createGetBackerFunction(defer: Q.Deferred<proposalBackingModel.IProposalBacking>, proposalContract, index: number) {
    // create(p: proposalModel.IProposal): Q.Promise<proposalModel.IProposal> {}
    // back(p: proposalModel.IProposal, amount: number, backingUser: userModel.IUser, fromCard: string): Q.Promise<proposalBackingModel.IProposalBacking> {}
    // processBacking(transactionId: string, p: proposalModel.IProposal, amount: number, backingUser: userModel.IUser, fromCard: string): Q.Promise<proposalBackingModel.IProposalBacking> {}
    // getOffers(proposalId: string): Q.Promise<Array<offerModel.IOffer>> {}
});
