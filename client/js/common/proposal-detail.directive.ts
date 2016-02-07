"use strict";

interface IProposalDetailScope {
    // proposal: IProposal;
    id: string;
    productName: string;
    productDescription: string;
    // mainCategory: string;
    // subCategory: string;
    // maxPrice: number;
    // endDate: Date;
    // ultimateDeliveryDate: Date;
    // nrOfBackings: number,
    // totalAmount: number
  }
  //Usage:
  //<div proposal-detail="vm.proposal"></div>
  class ProposalDetail_ implements ng.IDirective {
    static $inject: Array<string> = [''];
    constructor() { }

    static instance(): ng.IDirective {
      return new ProposalDetail_();
    }

    scope: IProposalDetailScope = {
      "id": "=",
      "productName": "@",
      "productDescription": "@"
    };
    templateUrl: string = "js/common/proposal-detail-ava.html";
    restrict: string = "EA";
  }
    
// angular.module("buycoApp").directive("propososalDetail_", ProposalDetail_.instance);

function PropososalDetail__() {
  return {
    require: 'ngModel',
    link: function(scope, element, attrs, ngModel) {
      element.colorPicker({
        // initialize the proposal to the color on the scope
        pickerDefault: scope.color,
        // update the ngModel whenever we pick a new color
        onColorChange: function(id, newValue) {
          scope.$apply(function() {
            ngModel.$setViewValue(newValue);
          });
        }
      });

      // update the color picker whenever the value on the scope changes
      ngModel.$render = function() {
        element.val(ngModel.$modelValue);
        element.change();
      };
    }
  }
};
angular.module("buyCoApp").directive('propososalDetail__', PropososalDetail__);

function ProposalDetail() {
  return {
    restrict: 'E',
    scope: {
      proposal: '='
    },
    templateUrl: "js/common/proposal-detail.html"
  };
}

angular.module("buyCoApp").directive('proposalDetail', ProposalDetail);
