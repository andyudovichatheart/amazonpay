(function($) {
  /* define init variables for your organization */
  jQuery(function() {
    
    /* UI handlers for the donation form example */
    if(jQuery('.donation-form').length > 0) {
      jQuery('.donate-select label').click(function() {
        if(jQuery(this).next('div').is('.level-other-input')) {
			jQuery('.level-other-input').slideDown();
          jQuery('#other-amount-entered').removeAttr('disabled');
          jQuery('#other-amount-entered').attr('name', 'other_amount_entered');
          jQuery('#other-amount-entered').focus();
        }
        else {
			jQuery('.level-other-input').slideUp();			
          jQuery('#other-amount-entered').attr('disabled', 'disabled');
          jQuery('#other-amount-entered').removeAttr('name');
        }
      });
      
	  jQuery('.gift-select label').click(function(){
			showLevels(jQuery(this).prev('input').data('frequency'),this);
  	  });

      jQuery('.donation-form').submit(function() {
		//move contact info details to billing info if any fields are blank
		jQuery('[id^=billing\\_]').each(function(){
		  if (jQuery(this).val() == ""){
			   jQuery(this).val(jQuery("[id='"+jQuery(this).attr("id").replace("billing_","donor_")+"']").val());
		  }
		});

		jQuery('input[name=compliance]').val("true");
		
        window.scrollTo(0, 0);
        jQuery(this).hide();
        jQuery(this).before('<div class="well donation-loading">' + 
                         'Thank You!  We are now processing your gift ...' + 
                       '</div>');

		
      });

		jQuery('.donation-form').validate();				   
		
		jQuery.validator.addMethod(
			"validDonation", 
			function(value, element) {
				if (value == 0 || (value >= 25 && value <= 500)) {
					return true;
				} else {
					return false;
				}
			},
			"Please enter an amount between $25 and $500"
		);

      jQuery('#donate-submit').click(function() {
		var form =jQuery('form.donation-form');
		jQuery(form).validate().settings.ignore = ":disabled,:hidden";
		if (jQuery(form).valid()) {
			if (jQuery('input[name=other_amount]').val() < 25) {
				alert("Please enter an amount $25 or greater");
				return false;
			}
			if (typeof amazon.Login.AmazonBillingAgreementId != "undefined") {
				if (jQuery('label[for="type-monthly"] .active').length > 0) {				
					if (amazon.Login.MODBuyerBillingAgreementConsentStatus === "true") {
						donateAmazon();
					} else {
						alert("Consent is needed before making donation");
					}
				} else {
					donateAmazon();					
				}
			} else {
				alert("Please login to Amazon and select payment before submitting");
				return false;
			}
		} else { 
			return false;
		}
      });
    }

	function donateAmazon() {
		window.scrollTo(0, 0);
		jQuery('.donation-form').hide();
		jQuery('.donation-form').before('<div class="well donation-loading">' + 
						 'Thank You!  We are now processing your donation using Amazon ...' + 
					   '</div>');
		var params = jQuery('.donation-form').serialize();
		var amazonErr = false;
		var status = "";
		var amt = 0;
		var ref = 0;
		
		jQuery.ajax({
			method: "POST",
			async: false,
			cache:false,
			dataType: "json",
			url:"https://hearttools.heart.org/donate/amazon/payWithAmazon.php?"+params+"&callback=?",
			success: function(data){
				if (jQuery('input[name=recurring]').val() == "true") {
					status = data.data.AuthorizeOnBillingAgreementResult.AuthorizationDetails.AuthorizationStatus.State;
					amt = data.data.AuthorizeOnBillingAgreementResult.AuthorizationDetails.CapturedAmount.Amount;
					ref = data.data.AuthorizeOnBillingAgreementResult.AuthorizationDetails.AmazonAuthorizationId;
					
					if (status != "Closed") {
						amazonErr = true;
					}
				} else {
					status = data.data.AuthorizeResult.AuthorizationDetails.AuthorizationStatus.State;
					amt = data.data.AuthorizeResult.AuthorizationDetails.CapturedAmount.Amount;
					ref = data.data.AuthorizeResult.AuthorizationDetails.AmazonAuthorizationId;
					
					if (status != "Closed") {
						amazonErr = true;
					}
				}

				if (amazonErr) {
					jQuery('#donation-errors').append('<div class="alert alert-danger">' + data.data.toString() + '</div>');	
			
					jQuery('.donation-loading').remove();
					jQuery('.donation-form').show();				
				} else {
					//save off amazon id into custom field
					jQuery('input[name=payment_confirmation_id]').val(ref);
					
					//logout of amazon
					amazon.Login.logout();
					
					//make offline donation in luminate to record transaction
					//if (jQuery('input[name="df_preview"]').val() != "true") 
					donateOffline();
					
					//var amt = data.donationResponse.donation.amount.decimal;
					var email = jQuery('input[name="email"]').val();
					var first = jQuery('input[name="first_name"]').val();
					var last = jQuery('input[name="last_name"]').val();
					var full = jQuery('input[name="first_name"]').val()+' '+jQuery('input[name="last_name"]').val();
					var street1 = jQuery('input[name="street1"]').val();
					var street2 = jQuery('input[name="street2"]').val();
					var city = jQuery('input[name="city"]').val();
					var state = jQuery('select[name="state"]').val();
					var zip = jQuery('input[name="zip"]').val();
					//var ref = data.donationResponse.donation.confirmation_code;
					var from_url = jQuery('input[name="from_url"]').val();
					
				  jQuery('.donation-loading').remove();
				  jQuery('.donate-now, .header-donate').hide();
				  jQuery('.thank-you').show();
				  var ty_url = "https://www2.heart.org/amazonpay/cyclenation/amazon/thankyou.html";
				  if (jQuery('input[name=instance]').val() == "heartdev") {
				  	ty_url = "https://secure3.convio.net/heartdev/amazonpay/cyclenation/amazon/thankyou.html";
				  }
				  jQuery.get(ty_url,function(datat){ 
					  jQuery('.thank-you').html(jQuery(datat).find('.thank-you').html());
					  jQuery('p.first').html(first);
					  jQuery('p.last').html(last);
					  jQuery('p.street1').html(street1);
					  jQuery('p.street2').html(street2);
					  jQuery('p.city').html(city);
					  jQuery('p.state').html(state);
					  jQuery('p.zip').html(zip);
					  jQuery('p.email').html(email);
					  jQuery('tr.card').hide();
					  jQuery('tr.amazon').show();
					  jQuery('p.amount').html("$"+amt);
					  jQuery('p.confcode').html(ref);
					  jQuery('p.from_url').html("<a href='"+from_url+"'>Return</a>");
					  jQuery('.share-url').each(function(){
						jQuery(this).attr("href",jQuery(this).attr("href").replace("%returnurl%",escape(from_url)));
					  });
					});
							  
				}
			}
		});

	}

	function donateOffline() {
		var params = jQuery('.donation-form').serialize();

		jQuery.ajax({
			method: "POST",
			async: false,
			cache:false,
			dataType: "json",
			url:"https://hearttools.heart.org/donate/convio-offline/addOfflineDonation-tr.php?"+params+"&callback=?",
			success: function(data){
				//donateCallback.success(data.data);
			}
		});

	}
  });
})(jQuery);

function showLevels(frequency, sel) {
	jQuery('.radio-label').removeClass("active");
	jQuery(sel).addClass("active");
    jQuery('.donate-select label.radio-level').removeClass("active");
	if (frequency == "recurring") {
		jQuery('.recurring').show();
		jQuery('.onetime').hide();
		jQuery('input[name=recurring]').val('true');
		jQuery("#consentWidgetDiv").show();
	    jQuery('.recurring label.radio-level:eq(1)').click();
	} else {
		jQuery('.recurring').hide();
		jQuery('.onetime').show();
		jQuery('input[name=recurring]').val('false');
		jQuery("#consentWidgetDiv").hide();
	    jQuery('.onetime label.radio-level:eq(1)').click();
	}
}

function getAmazonAddress() {
	var params = jQuery('.donation-form').serialize();
	jQuery.ajax({
		method: "POST",
		async: false,
		cache:false,
		dataType: "json",
		url:"https://hearttools.heart.org/donate/amazon/getAmazonAddress.php?"+params+"&callback=?",
		success: function(data){
			var address = data.data.GetBillingAgreementDetailsResult.BillingAgreementDetails.BillingAddress.PhysicalAddress;
			jQuery('input[name="street1"]').val(address.AddressLine1);
			jQuery('input[name="city"]').val(address.City);
			jQuery('select[name="state"]').val(address.StateOrRegion);
			jQuery('input[name="billing_street1"]').val(address.AddressLine1);
			jQuery('input[name="billing_city"]').val(address.City);
			jQuery('input[name="billing_state"]').val(address.StateOrRegion);
		}
	});
}

(function ($) {
	jQuery.extend({
		getQuerystring: function(name){
		  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		  var regexS = "[\\?&]" + name + "=([^&#]*)";
		  var regex = new RegExp(regexS);
		  var results = regex.exec(location.href);
		  if(results == null)
			return "";
		  else
			return decodeURIComponent(results[1].replace(/\+/g, " "));
		}
	});
})(jQuery);

//copy donor fields to billing
jQuery('[id^=donor_]').each(function(){
  jQuery(this).blur(function(){
    jQuery("[id='"+jQuery(this).attr("id").replace("donor_","billing_")+"']").val(jQuery(this).val());
  });
});

//autofill from querystring data
jQuery('input[name="first_name"]').val(jQuery.getQuerystring("first"));
jQuery('input[name="last_name"]').val(jQuery.getQuerystring("last"));
jQuery('input[name="street1"]').val(jQuery.getQuerystring("street1"));	
jQuery('input[name="dstreet2"]').val(jQuery.getQuerystring("street2"));	
jQuery('input[name="city"]').val(jQuery.getQuerystring("city"));	
jQuery('input[name="state"]').val(jQuery.getQuerystring("state"));	
jQuery('input[name="zip"]').val(jQuery.getQuerystring("zip"));	
jQuery('input[name="email"]').val(jQuery.getQuerystring("email"));	


// END QUERY STRING CODE 