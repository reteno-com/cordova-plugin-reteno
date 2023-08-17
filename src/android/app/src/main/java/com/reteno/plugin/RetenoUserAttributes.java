package com.reteno.plugin;

import com.reteno.core.domain.model.user.Address;
import com.reteno.core.domain.model.user.User;
import com.reteno.core.domain.model.user.UserAttributes;
import com.reteno.core.domain.model.user.UserAttributesAnonymous;
import com.reteno.core.domain.model.user.UserCustomField;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class RetenoUserAttributes {
  private static List<UserCustomField> buildUserCustomData(JSONArray fields) throws JSONException {
    int countView = fields.length();
    if (countView == 0) return null;

    List<UserCustomField> list = new ArrayList<>();
    for (int i = 0; i < countView; i++) {
      JSONObject field = fields.getJSONObject(i);

      String key = null;
      String value = null;

      if (field.getString("key") != null) {
        key = field.getString("key");
      }
      if (field.getString("value") != null) {
        value = field.getString("value");
      }

      if (key != null) {
        list.add(new UserCustomField(key, value));
      }
    }
    return list;
  }

  private static List<String> buildStringArr(JSONObject user, String key) throws JSONException {
    if (user == null) {
      return null;
    }
    if (!user.has(key))
      return null;
    JSONArray payloadStringArr = user.getJSONArray(key);
    if (payloadStringArr == null) {
      return null;
    }
    int countView = payloadStringArr.length();
    if (countView == 0) return null;

    List<String> stringArr = new ArrayList<>();
    for (int i = 0; i < countView; i++) {
      String str = payloadStringArr.getString(i);
      stringArr.add(str);
    }
    return stringArr;
  }

  public static User buildUserFromPayload(JSONObject payloadUser) throws JSONException {
    JSONObject payloadUserAttributes = null;

    String payloadPhone = null;
    String payloadEmail = null;
    String payloadFirstName = null;
    String payloadLastName = null;
    String payloadLanguageCode = null;
    String payloadTimeZone = null;

    JSONObject payloadAddress = null;
    JSONArray payloadFields = null;

    Address address = null;
    List<UserCustomField> fields = null;

    if (payloadUser != null) {
      payloadUserAttributes = payloadUser.getJSONObject("userAttributes");
      if (payloadUserAttributes != null) {
        payloadPhone =  RetenoUtil.getStringOrNull(payloadUserAttributes, "phone");
        payloadEmail = RetenoUtil.getStringOrNull(payloadUserAttributes, "email");
        payloadFirstName = RetenoUtil.getStringOrNull(payloadUserAttributes, "firstName");
        payloadLastName = RetenoUtil.getStringOrNull(payloadUserAttributes, "lastName");
        payloadLanguageCode = RetenoUtil.getStringOrNull(payloadUserAttributes, "languageCode");
        payloadTimeZone = RetenoUtil.getStringOrNull(payloadUserAttributes, "timeZone");
        if (payloadUserAttributes.has("address"))
          payloadAddress = payloadUserAttributes.getJSONObject("address");
        if (payloadUserAttributes.has("fields"))
          payloadFields = payloadUserAttributes.getJSONArray("fields");
      }
    }

    if (payloadAddress != null) {
      address = new Address(
              RetenoUtil.getStringOrNull(payloadAddress, "region"),
              RetenoUtil.getStringOrNull(payloadAddress,"town"),
              RetenoUtil.getStringOrNull(payloadAddress,"address"),
              RetenoUtil.getStringOrNull(payloadAddress,"postcode")
      );
    }

    if (payloadFields != null) {
      fields = buildUserCustomData(payloadFields);
    }

    UserAttributes userAttributes = new UserAttributes(
      payloadPhone,
      payloadEmail,
      payloadFirstName,
      payloadLastName,
      payloadLanguageCode,
      payloadTimeZone,
      address,
      fields
    );

    List<String> subscriptionKeys = buildStringArr(payloadUser, "subscriptionKeys");
    List<String> groupNamesInclude = buildStringArr(payloadUser, "groupNamesInclude");
    List<String> groupNamesExclude = buildStringArr(payloadUser, "groupNamesExclude");

    return new User(userAttributes, subscriptionKeys, groupNamesInclude, groupNamesExclude);
  }

  public static UserAttributesAnonymous buildAnonymousUserFromPayload(JSONObject payloadUser) throws JSONException {
    JSONObject payloadUserAttributes = null;

    String payloadFirstName = null;
    String payloadLastName = null;
    String payloadLanguageCode = null;
    String payloadTimeZone = null;

    JSONObject payloadAddress = null;
    JSONArray payloadFields = null;

    Address address = null;
    List<UserCustomField> fields = null;

    if (payloadUser != null) {
      payloadUserAttributes = payloadUser.getJSONObject("userAttributes");
      if (payloadUserAttributes != null) {
        payloadFirstName = RetenoUtil.getStringOrNull(payloadUserAttributes, "firstName");
        payloadLastName = RetenoUtil.getStringOrNull(payloadUserAttributes, "lastName");
        payloadLanguageCode = RetenoUtil.getStringOrNull(payloadUserAttributes, "languageCode");
        payloadTimeZone = RetenoUtil.getStringOrNull(payloadUserAttributes, "timeZone");
        if (payloadUserAttributes.has("address"))
          payloadAddress = payloadUserAttributes.getJSONObject("address");
        if (payloadUserAttributes.has("fields"))
          payloadFields = payloadUserAttributes.getJSONArray("fields");
      }
    }

    if (payloadAddress != null) {
      address = new Address(
              RetenoUtil.getStringOrNull(payloadAddress, "region"),
              RetenoUtil.getStringOrNull(payloadAddress,"town"),
              RetenoUtil.getStringOrNull(payloadAddress,"address"),
              RetenoUtil.getStringOrNull(payloadAddress,"postcode")
      );
    }
    if (payloadFields != null) {
      fields = buildUserCustomData(payloadFields);
    }

    UserAttributesAnonymous userAttributes = new UserAttributesAnonymous(
            payloadFirstName,
            payloadLastName,
            payloadLanguageCode,
            payloadTimeZone,
            address,
            fields
    );
    return userAttributes;
  }
}
