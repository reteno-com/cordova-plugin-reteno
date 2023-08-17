package com.reteno.plugin;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.apache.cordova.firebase.FirebasePlugin;

public class RetenoPushReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        FirebasePlugin.sendMessage(intent.getExtras(), context);
    }
}
