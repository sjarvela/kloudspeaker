<?php
	/**
	 * AuthenticatorLDAP.class.php
	 *
	 * Copyright 2015- Samuli Järvelä
	 * Released under GPL License.
	 *
	 * License: http://www.kloudspeaker.com/license.php
	 */

	class Kloudspeaker_Authenticator_LDAP extends Kloudspeaker_Authenticator {
		private $env;
		
		public function __construct($env) {
			$this->env = $env;
		}
		
		public function authenticate($user, $pw, $auth) {
			$server = $this->env->settings()->setting("ldap_server");

			Logging::logDebug("Authenticating with LDAP @ server: ".$server);
			$conn = @ldap_connect($server);
			if (!$conn)
				throw new ServiceException("INVALID_CONFIGURATION", "Could not connect to LDAP server");
			
			/* If the server string does NOT start with "ldaps:" and they
			 * have enabled starttls, we'll force proto version 3 and do
			 * the starttls.
			 */
			if (strcasecmp(substr(trim($server), 0, 5), "ldaps:") != 0 &&
				$this->env->settings()->setting("ldap_use_starttls")) {

				// Try for v3 and do startTLS
				if (!ldap_set_option($conn, LDAP_OPT_PROTOCOL_VERSION, 3) ||
					!ldap_start_tls($conn)) {

					Logging::logDebug("LDAP error during starttls: ".ldap_error($conn));
					return FALSE;
				}
			}

			/* If $search is set then we'll use $bind_dn and $bind_pw
			 * for the 'anonymous' user that retrieves the user's dn
			 * and we'll do the '[USER]' substitution in $search.
			 * Otherwise we'll use the $connString as originally defined.
			 */
			$search = $this->env->settings()->setting("ldap_search");
			if ($search) {
				ldap_set_option($conn, LDAP_OPT_REFERRALS, 0);

				// Bind for search
				$bind_dn = $this->env->settings()->setting("ldap_bind_dn");
				$bind_pw = $this->env->settings()->setting("ldap_bind_pw");

				$bind = @ldap_bind($conn, $bind_dn, $bind_pw);
				if (!$bind) {
					Logging::logDebug("LDAP error during search bind: ".ldap_error($conn));
					return FALSE;
				}
				
				// Do the search as requested -- need to do sub.
				$search = str_replace("[USER]", $user["name"], $search);
				$base_dn = $this->env->settings()->setting("ldap_base_dn");

				$vals = array("dn");
				$results = @ldap_search($conn, $base_dn, $search, $vals);
				if (!$results) {
					Logging::logDebug("LDAP error during search: ".ldap_error($conn));
					return FALSE;
				}

				// There can be only one!
				if (ldap_count_entries($conn, $results) != 1) {
					Logging::logDebug("LDAP error: non-unique search result: ".ldap_error($conn));
					return FALSE;
				}

				// Grab user's DN as $connString
				$entry = @ldap_first_entry($conn, $results);
				if (!$entry) {
					Logging::logDebug("LDAP error no search result: ".ldap_error($conn));
					return FALSE;
				}
				$connString = ldap_get_dn($conn, $entry);
			} else {
				// OK.  We'll try direct connects as per original method
				$connString = $this->env->settings()->setting("ldap_conn_string");
				if (strpos($connString, "[USER]") === FALSE) {
					$connString = $user["name"].$connString;
				} else {
					$connString = str_replace("[USER]", $user["name"], $connString);
				}
			}

			Logging::logDebug("Authenticating with LDAP: ".$connString);
			$bind = @ldap_bind($conn, $connString, $pw);
			if (!$bind) {
				Logging::logDebug("LDAP error: ".ldap_error($conn));
				return FALSE;
			}
			ldap_close($conn);
			return TRUE;
		}
	}
?>
